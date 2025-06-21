import { z } from 'zod';

export class ServerError extends Error {
    public statusCode: number;
    public body: { message: string; error?: string | object | string[] };

    constructor(statusCode: number, message: string, error?: string | object | string[]) {
        super(message);
        this.statusCode = statusCode;
        this.body = { message, error };
    }
}

export const handleError = (error: any) => {
    let statusCode: number;
    let body: { message: string; error?: string | object | string[] };
    if (error instanceof ServerError) {
        statusCode = error.statusCode;
        body = error.body;
    } else {
        statusCode = 500;
        body = { message: 'Internal server error' };
    }
    if ([500, 502, 503].includes(statusCode)) console.error(error);
    return { statusCode, body };
};

const imageStringSchema = z.string().refine(
    (val) =>
        /^https?:\/\/.+/.test(val) || /^data:image\/[a-zA-Z]+;base64,/.test(val) || /^[A-Za-z0-9+/=]+$/.test(val),
    { message: 'Must be a valid URL or base64 image string' }
);

export const productSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    images: z.array(imageStringSchema).optional(),
    price: z.number().positive('Price must be a positive number').min(0, 'Price cannot be negative').refine((val: number) => val !== null, 'Price is required'),
    currency: z.string().min(1, 'Currency is required'),
    inStock: z.boolean().optional(),
    reviews: z.array(
        z.object({
            user: z.string().min(1, 'Review user is required'),
            rating: z.number().int('Rating must be an integer').min(1, 'Rating must be at least 1').max(5, 'Rating can be at most 5'),
            comment: z.string().optional(),
        })
    ).optional(),
    location: z.object({
        aisle: z.string().optional(),
        section: z.string().optional(),
        shelf: z.string().optional(),
    }).optional(),
});
