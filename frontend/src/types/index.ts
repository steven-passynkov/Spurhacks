export interface Message {
    id: string
    content: string
    sender: "user" | "system"
    timestamp: Date
    audioUrl?: string
    products?: Product[]
}

export interface Product {
    sku: string
    companyId: string
    name: string
    description: string
    category: string
    brand: string
    images: string[]
    price: number
    currency: string
    createdAt: string
    updatedAt: string
    inStock?: boolean
    colors?: string[]
    sizes?: string[]
    location?: {
        aisle: string
        section: string
        shelf: string
    }
    reviews?: {
        user: string
        rating: number
        comment: string
    }[]
}

export interface StoreConfig {
    companyId?: string
    branding?: {
        logoUrl?: string
    }
    theme?: {
        primaryColor?: string
        backgroundColor?: string
        textColor?: string
        accentColor?: string
    }
    chat?: {
        placeholder?: string
    }
    products?: {
        currency?: string
    }
    welcome?: {
        title?: string
        subtitle?: string
    }
}