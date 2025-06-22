import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, MicOff, Wifi, WifiOff, Chrome, AlertTriangle, Volume2 } from "lucide-react"

export default function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")

  const ws = useRef<WebSocket | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioBufferRef = useRef<Int16Array[]>([])

  // Audio queue state and ref
  const [audioQueue, setAudioQueue] = useState<{ base64: string; mimeType: string }[]>([])
  const isPlayingRef = useRef(false)

  const connectWebSocket = () => {
    if (isConnected) {
      ws.current?.close()
      return
    }

    setConnectionStatus("connecting")
    ws.current = new WebSocket("ws://localhost:8000")

    ws.current.onopen = () => {
      setIsConnected(true)
      setConnectionStatus("connected")
      ws.current?.send(JSON.stringify({ "company-id": "waggin-tails" }))
    }

    ws.current.onmessage = (event) => {
      const response = JSON.parse(event.data)?.response
      if (response?.mimeType?.startsWith("audio/pcm")) {
        // Queue audio instead of playing immediately
        setAudioQueue((q) => [...q, { base64: response.message, mimeType: response.mimeType }])
      }
    }

    ws.current.onclose = () => {
      setIsConnected(false)
      setConnectionStatus("disconnected")
    }

    ws.current.onerror = (e) => {
      console.error("WebSocket error:", e)
      setIsConnected(false)
      setConnectionStatus("disconnected")
    }
  }

  const sendAudio = () => {
    if (!ws.current || audioBufferRef.current.length === 0) return

    const total = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0)
    const combined = new Int16Array(total)
    let offset = 0
    for (const chunk of audioBufferRef.current) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const buffer = new ArrayBuffer(combined.length * 2)
    const view = new DataView(buffer)
    combined.forEach((val, i) => view.setInt16(i * 2, val, true))

    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

    ws.current.send(
        JSON.stringify({
          request: {
            message: base64,
            mimeType: "audio/pcm;rate=16000",
          },
        }),
    )

    audioBufferRef.current = []
  }

  // Create a single AudioContext for playback
  useEffect(() => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext()
    }
    return () => {
      playbackContextRef.current?.close()
    }
  }, [])

  // Play audio from queue one at a time
  useEffect(() => {
    if (audioQueue.length === 0 || isPlayingRef.current) return

    const { base64, mimeType } = audioQueue[0]
    isPlayingRef.current = true

    // Get sample rate from mimeType, fallback to 24000
    const rate = Number.parseInt(mimeType.match(/rate=(\d+)/)?.[1] || "24000", 10)

    // Decode base64 to Uint8Array
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    // Convert to Int16Array (little-endian)
    const samples = bytes.length / 2
    const pcm = new Int16Array(samples)
    const dv = new DataView(bytes.buffer)
    for (let i = 0; i < samples; i++) {
      pcm[i] = dv.getInt16(i * 2, true)
    }

    // Convert to Float32Array
    const float32 = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
      float32[i] = pcm[i] / 32768
    }

    // Use the shared AudioContext, resample if needed
    const ctx = playbackContextRef.current!
    // If sample rate doesn't match, create a new context
    let contextToUse = ctx
    let closeAfter = false
    if (ctx.sampleRate !== rate) {
      contextToUse = new AudioContext({ sampleRate: rate })
      closeAfter = true
    }

    const audioBuffer = contextToUse.createBuffer(1, float32.length, rate)
    audioBuffer.copyToChannel(float32, 0)

    const source = contextToUse.createBufferSource()
    source.buffer = audioBuffer
    source.connect(contextToUse.destination)

    source.onended = () => {
      if (closeAfter) contextToUse.close()
      isPlayingRef.current = false
      setAudioQueue((q) => q.slice(1))
    }

    source.start()

    // eslint-disable-next-line
  }, [audioQueue])

  // Detect Chrome and SpeechRecognition support
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const hasSpeechRecognition = isChrome && !!SpeechRecognition

  // Speech-to-text handler for Chrome
  const startSpeechToText = () => {
    if (!ws.current || !hasSpeechRecognition) return

    setIsRecording(true)
    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      ws.current?.send(
          JSON.stringify({
            request: {
              message: text,
              mimeType: "text/plain",
            },
          }),
      )
      setIsRecording(false)
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
  }

  useEffect(() => {
    return () => {
      ws.current?.close()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      processorRef.current?.disconnect()
      playbackContextRef.current?.close()
    }
  }, [])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      default:
        return "bg-red-500"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      default:
        return "Disconnected"
    }
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Voice Chat</h1>
            <p className="text-slate-600">Real-time audio communication</p>
          </div>

          {/* Browser Compatibility Alert */}
          {!isChrome && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="flex items-center gap-2">
                    <Chrome className="h-4 w-4" />
                    This application requires Google Chrome for optimal performance.
                  </div>
                </AlertDescription>
              </Alert>
          )}

          {/* Main Control Panel */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
                <CardTitle className="text-xl">Connection Status</CardTitle>
              </div>
              <CardDescription>
                <Badge variant={isConnected ? "default" : "secondary"} className="text-sm">
                  {getConnectionStatusText()}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Control */}
              <div className="flex justify-center">
                <Button
                    onClick={connectWebSocket}
                    size="lg"
                    variant={isConnected ? "destructive" : "default"}
                    disabled={connectionStatus === "connecting"}
                    className="min-w-[140px]"
                >
                  {connectionStatus === "connecting" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Connecting...
                      </>
                  ) : isConnected ? (
                      <>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Disconnect
                      </>
                  ) : (
                      <>
                        <Wifi className="mr-2 h-4 w-4" />
                        Connect
                      </>
                  )}
                </Button>
              </div>

              {/* Voice Controls */}
              {isConnected && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-center mb-4">Voice Controls</h3>

                      {/* Speech Recognition */}
                      {hasSpeechRecognition ? (
                          <div className="flex flex-col items-center space-y-3">
                            <Button
                                onClick={startSpeechToText}
                                disabled={!isConnected || isRecording}
                                size="lg"
                                variant={isRecording ? "destructive" : "default"}
                                className="min-w-[160px] h-12"
                            >
                              {isRecording ? (
                                  <>
                                    <div className="animate-pulse">
                                      <MicOff className="mr-2 h-5 w-5" />
                                    </div>
                                    Recording...
                                  </>
                              ) : (
                                  <>
                                    <Mic className="mr-2 h-5 w-5" />
                                    Start Speaking
                                  </>
                              )}
                            </Button>
                            {isRecording && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                  Listening for speech...
                                </div>
                            )}
                          </div>
                      ) : (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Speech recognition is not available in this browser.</AlertDescription>
                          </Alert>
                      )}
                    </div>
                  </div>
              )}

              {/* Audio Queue Status */}
              {audioQueue.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                      <Volume2 className="h-4 w-4" />
                      <span>
                    {audioQueue.length} audio message{audioQueue.length !== 1 ? "s" : ""} in queue
                  </span>
                      {isPlayingRef.current && (
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-3 bg-blue-500 animate-pulse rounded" />
                            <div className="w-1 h-2 bg-blue-500 animate-pulse rounded" style={{ animationDelay: "0.1s" }} />
                            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded" style={{ animationDelay: "0.2s" }} />
                          </div>
                      )}
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-slate-900">How to use:</h3>
              <ol className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                <span className="bg-slate-300 text-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                  1
                </span>
                  Click "Connect" to establish a WebSocket connection
                </li>
                <li className="flex items-start gap-2">
                <span className="bg-slate-300 text-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                  2
                </span>
                  Use "Start Speaking" to send voice messages
                </li>
                <li className="flex items-start gap-2">
                <span className="bg-slate-300 text-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                  3
                </span>
                  Audio responses will play automatically
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
