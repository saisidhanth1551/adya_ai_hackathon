declare module '@woocommerce/woocommerce-rest-api' {
    interface WooCommerceRestApiOptions {
        url: string;
        consumerKey: string;
        consumerSecret: string;
        version: string;
        queryStringAuth?: boolean;
    }

    interface WooCommerceRestApiResponse {
        data: any;
        status: number;
    }

    class WooCommerceRestApi {
        constructor(options: WooCommerceRestApiOptions);
        get(endpoint: string): Promise<WooCommerceRestApiResponse>;
        post(endpoint: string, data: any): Promise<WooCommerceRestApiResponse>;
        put(endpoint: string, data: any): Promise<WooCommerceRestApiResponse>;
        delete(endpoint: string): Promise<WooCommerceRestApiResponse>;
    }

    export default WooCommerceRestApi;
}