import express, { Request, Response } from 'express';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import dotenv from 'dotenv';
import { AxiosError } from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// WooCommerce API initialization
const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOOCOMMERCE_URL || 'your_store_url',
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || 'your_consumer_key',
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || 'your_consumer_secret',
  version: 'wc/v3'
});

app.use(express.json());

/**
 * Health Check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

/**
 * Get all products
 */
app.get('/products', async (_req: Request, res: Response) => {
  try {
    const response = await WooCommerce.get('products');
    res.status(200).json(response.data);
  } catch (error) {
    const errorMessage = error instanceof AxiosError
      ? error.response?.data || error.message
      : error;

    console.error('Error fetching products:', errorMessage);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Create a product
 */
app.post('/products', async (req: Request, res: Response) => {
  try {
    const response = await WooCommerce.post('products', req.body);
    res.status(201).json(response.data);
  } catch (error) {
    let errorMessage = 'Failed to create product';

    if (error instanceof AxiosError) {
      console.error('Error creating product:', error.response?.data || error.message);
      errorMessage = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
    } else {
      console.error('Unknown error creating product:', error);
    }

    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Delete a product (force delete)
 */
app.delete('/products/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    const response = await WooCommerce.delete(`products/${id}`);

    res.status(200).json({
      message: `🗑️ Product ID ${id} deleted successfully.`,
      data: response.data
    });
  } catch (error) {
    let errorMessage = `Failed to delete product with ID ${id}`;

    if (error instanceof AxiosError) {
      console.error('Error deleting product:', error.response?.data || error.message);
      errorMessage = error.response?.data?.message || error.message;
    } else {
      console.error('Unknown error deleting product:', error);
    }

    res.status(500).json({ error: errorMessage });
  }
});

// Start REST server
app.listen(port, () => {
  console.log(`✅ WooCommerce REST server running on port ${port}`);
});
