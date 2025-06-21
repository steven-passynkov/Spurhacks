import { useEffect, useState } from "react"

export function useCompanyConfig(companyId?: string) {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!companyId) {
      setConfig(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`https://spurhacks-company.s3.us-east-1.amazonaws.com/${companyId}/config.json`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch config")
        return res.json()
      })
      .then(setConfig)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [companyId])

  return { config, loading, error }
}
