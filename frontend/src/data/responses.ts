import { mockProducts } from "./products"

export const mockResponsesWithProducts = [
    {
        text: "I found some great waterproof jackets for you! Here are my top recommendations:",
        audioUrl: "/mock-audio-1.mp3",
        products: [mockProducts[0], mockProducts[1], mockProducts[2]],
    },
    {
        text: "Based on your query, here are some excellent running shoes that might interest you:",
        audioUrl: "/mock-audio-2.mp3",
        products: [mockProducts[4]],
    },
    {
        text: "I found some outdoor gear that would be perfect for your adventures:",
        audioUrl: "/mock-audio-3.mp3",
        products: [mockProducts[0], mockProducts[5]],
    },
]

export const mockTextOnlyResponses = [
    {
        text: "I'd be happy to help you with that! Let me check our current inventory and find the best options for you.",
        audioUrl: "/mock-audio-4.mp3",
    },
    {
        text: "That's a great question! What specific features are you looking for?",
        audioUrl: "/mock-audio-5.mp3",
        products: [mockProducts[0], mockProducts[4]],
    },
]
