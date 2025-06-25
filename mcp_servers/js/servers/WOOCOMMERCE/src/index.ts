import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";

// Initialize MCP server
const server = new McpServer({
  name: "WooCommerce Service",
  version: "1.0.0",
});

// WooCommerce API config
const woocommerceConfig = {
  url: process.env.WOOCOMMERCE_URL || 'your_store_url',
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || 'your_consumer_key',
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || 'your_consumer_secret',
  version: 'wc/v3'
};

// Helper function for GET
async function makeWooCommerceRequest(endpoint, params = {}) {
  try {
    const response = await axios.get(
      `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/${endpoint}`,
      {
        params,
        auth: {
          username: woocommerceConfig.consumerKey,
          password: woocommerceConfig.consumerSecret
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error making WooCommerce request:', error.message);
    throw new Error(`Failed to fetch data from WooCommerce: ${error.message}`);
  }
}

// Format order
function formatOrder(order) {
  const items = order.line_items.map(item =>
    `- ${item.quantity}x ${item.name} (${item.price})`
  ).join('\n');

  return `
Order #${order.id}
Date: ${new Date(order.date_created).toLocaleString()}
Status: ${order.status}
Customer: ${order.billing.first_name} ${order.billing.last_name} (${order.billing.email})
Total: ${order.total} ${order.currency}

Items:
${items}

Shipping Address:
${order.shipping.first_name} ${order.shipping.last_name}
${order.shipping.address_1}
${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}
${order.shipping.country}
`;
}

const recentToolCalls = new Set();

// getRecentOrders tool
server.tool(
  "getRecentOrders",
  {
    status: z.string().optional(),
    limit: z.number().optional(),
    after: z.string().optional(),
    before: z.string().optional()
  },
  async ({ status, limit, after, before }) => {
    const queryParams = {};
    if (limit && limit > 0) queryParams.per_page = limit;
    if (status) queryParams.status = status;
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) queryParams.after = afterDate.toISOString();
    }
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) queryParams.before = beforeDate.toISOString();
    }

    try {
      const orders = await makeWooCommerceRequest('orders', queryParams);
      if (!orders || orders.length === 0) {
        return { content: [{ type: "text", text: "No orders found matching your criteria." }] };
      }
      return { content: [{ type: "text", text: orders.map(formatOrder).join('\n\n---\n\n') }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error fetching orders: ${error.message}` }] };
    }
  }
);

// getOrderById tool
server.tool(
  "getOrderById",
  { id: z.number().describe("The order ID") },
  async ({ id }) => {
    try {
      const order = await makeWooCommerceRequest(`orders/${id}`);
      return { content: [{ type: "text", text: formatOrder(order) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error fetching order #${id}: ${error.message}` }] };
    }
  }
);

// createOrder tool
server.tool(
  "createOrder",
  {
    billing: z.object({
      first_name: z.string(), last_name: z.string(), address_1: z.string(),
      address_2: z.string().optional(), city: z.string(), state: z.string(),
      postcode: z.string(), country: z.string(), email: z.string(), phone: z.string()
    }),
    shipping: z.object({
      first_name: z.string(), last_name: z.string(), address_1: z.string(),
      address_2: z.string().optional(), city: z.string(), state: z.string(),
      postcode: z.string(), country: z.string()
    }),
    line_items: z.array(z.object({
      product_id: z.number(), variation_id: z.number().optional(), quantity: z.number()
    })),
    shipping_lines: z.array(z.object({
      method_id: z.string(), method_title: z.string(), total: z.string()
    })),
    payment_method: z.string(),
    payment_method_title: z.string(),
    set_paid: z.boolean()
  },
  async ({ billing, shipping, line_items, shipping_lines, payment_method, payment_method_title, set_paid }) => {
    console.log("🛒 createOrder called at", new Date().toISOString());

    const orderKey = `${billing.email}-${line_items.map(li => `${li.product_id}:${li.quantity}`).join("-")}`;
    if (recentToolCalls.has(orderKey)) {
      return { content: [{ type: "text", text: "⚠️ Duplicate createOrder request in progress or just completed. Please wait." }] };
    }
    recentToolCalls.add(orderKey);
    setTimeout(() => recentToolCalls.delete(orderKey), 10000);

    try {
      const recentOrders = await makeWooCommerceRequest("orders", {
        per_page: 10,
        orderby: "date",
        order: "desc"
      });

      const duplicateOrder = recentOrders.find(order =>
        order.billing.email === billing.email &&
        order.line_items?.length === line_items.length &&
        order.line_items.every((item, index) => {
          const li = line_items[index];
          return item.product_id === li.product_id &&
                 item.quantity === li.quantity &&
                 (item.variation_id || null) === (li.variation_id || null);
        })
      );

      if (duplicateOrder) {
        return {
          content: [{
            type: "text",
            text: `⚠️ Duplicate order detected. Existing Order ID: ${duplicateOrder.id}`
          }]
        };
      }

      const orderData = {
        billing, shipping, line_items, shipping_lines,
        payment_method, payment_method_title, set_paid
      };

      const response = await axios.post(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/orders`,
        orderData,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `✅ Order created successfully! Order ID: ${response?.data?.id}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error creating order: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "createCoupon",
  {
    code: z.string(),
    discount_type: z.enum(["percent", "fixed_cart", "fixed_product"]),
    amount: z.string(),
    individual_use: z.boolean().optional().default(false),
    exclude_sale_items: z.boolean().optional().default(false),
    minimum_amount: z.string().optional(),
    maximum_amount: z.string().optional(),
    usage_limit: z.number().optional(),
    usage_limit_per_user: z.number().optional()
  },
  async ({
    code, discount_type, amount,
    individual_use, exclude_sale_items,
    minimum_amount, maximum_amount,
    usage_limit, usage_limit_per_user
  }) => {
    console.log("🎟️ createCoupon called at", new Date().toISOString());

    const couponKey = `${code}-${discount_type}-${amount}`;
    if (recentToolCalls.has(couponKey)) {
      return {
        content: [{ type: "text", text: "⚠️ Duplicate createCoupon request in progress or just completed. Please wait." }]
      };
    }
    recentToolCalls.add(couponKey);
    setTimeout(() => recentToolCalls.delete(couponKey), 10000);

    try {
      const couponData = {
        code,
        discount_type,
        amount,
        individual_use,
        exclude_sale_items,
        minimum_amount,
        maximum_amount,
        usage_limit,
        usage_limit_per_user
      };

      const response = await axios.post(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/coupons`,
        couponData,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `✅ Coupon created successfully! Coupon Code: ${response?.data?.code}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error creating coupon: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "getAllCoupons",
  {},
  async () => {
    console.log("🎟️ getAllCoupons called at", new Date().toISOString());

    try {
      const response = await axios.get(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/coupons`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      const coupons = response.data?.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        amount: coupon.amount,
        discount_type: coupon.discount_type,
        description: coupon.description,
        date_created: coupon.date_created,
        usage_count: coupon.usage_count
      }));

      return {
        content: [
          {
            type: "text",
            text: `🎫 Found ${coupons.length} coupon(s):\n` +
                  coupons.map(c => `🔹 ${c.code} - ${c.amount} (${c.discount_type})`).join("\n")
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error fetching coupons: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "getCouponById",
  {
    id: z.number()
  },
  async ({ id }) => {
    console.log("🔍 getCouponById called at", new Date().toISOString(), "for ID:", id);

    try {
      const response = await axios.get(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/coupons/${id}`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      const coupon = response.data;

      return {
        content: [{
          type: "text",
          text:
            `🎫 Coupon Details:\n` +
            `• ID: ${coupon.id}\n` +
            `• Code: ${coupon.code}\n` +
            `• Amount: ${coupon.amount}\n` +
            `• Type: ${coupon.discount_type}\n` +
            `• Description: ${coupon.description || "N/A"}\n` +
            `• Usage Count: ${coupon.usage_count}\n` +
            `• Individual Use: ${coupon.individual_use ? "Yes" : "No"}\n` +
            `• Exclude Sale Items: ${coupon.exclude_sale_items ? "Yes" : "No"}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error fetching coupon: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "getAllCustomers",
  {},
  async () => {
    console.log("👥 getAllCustomers called at", new Date().toISOString());

    try {
      const response = await axios.get(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/customers`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      const customers = response.data.map(customer => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`.trim(),
        email: customer.email,
        username: customer.username,
        total_orders: customer.orders_count,
        total_spent: customer.total_spent
      }));

      return {
        content: [{
          type: "text",
          text: `👤 Total Customers: ${customers.length}\n` +
                customers.map(c =>
                  `🔹 ${c.name || c.username} (${c.email}) - Orders: ${c.total_orders}, Spent: ₹${c.total_spent}`
                ).join("\n")
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error fetching customers: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

// getAllProducts tool
server.tool(
  "getAllProducts",
  z.object({}),
  async () => {
    const key = "getAllProducts";
    if (recentToolCalls.has(key)) {
      return { content: [{ type: "text", text: "⏳ Already processing getAllProducts. Please wait..." }] };
    }
    recentToolCalls.add(key);
    setTimeout(() => recentToolCalls.delete(key), 5000);

    try {
      const products = await makeWooCommerceRequest("products");

      if (!products || products.length === 0) {
        return { content: [{ type: "text", text: "No products found." }] };
      }

      const productsList = products.map((product) => {
        return `🛍️ ${product.name} (ID: ${product.id}) - ₹${product.price}`;
      });

      return { content: [{ type: "text", text: productsList.join("\n") }] };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return { content: [{ type: "text", text: `❌ ${message}` }] };
    }
  }
);

// deleteProductById tool
server.tool(
  "deleteProductById",
  z.object({ id: z.number().describe("The ID of the product to delete") }),
  async ({ id }) => {
    try {
      const response = await axios.delete(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/products/${id}`,
        {
          params: { force: true },
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );
      return { content: [{ type: "text", text: `🗑️ Product ID ${id} deleted successfully.` }] };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return { content: [{ type: "text", text: `❌ Failed to delete product: ${message}` }] };
    }
  }
);

// createProduct tool
server.tool(
  "createProduct",
  z.object({
    name: z.string(),
    type: z.string().default("simple"),
    regular_price: z.string(),
    description: z.string(),
    short_description: z.string(),
    categories: z.array(z.object({ id: z.number() })).optional(),
    images: z.array(z.object({ id: z.number().optional(), src: z.string().url().optional() })).optional()
  }),
  async (input) => {
    try {
      const response = await axios.post(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/products`,
        input,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      return {
        content: [{ type: "text", text: `✅ Product created: ${response.data.name} (ID: ${response.data.id})` }]
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      return {
        content: [{ type: "text", text: `❌ Failed to create product: ${message}` }]
      };
    }
  }
);

server.tool(
  "deleteOrderById",
  {
    id: z.number()
  },
  async ({ id }) => {
    console.log("🗑️ deleteOrderById called at", new Date().toISOString(), "for ID:", id);

    try {
      const response = await axios.delete(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/orders/${id}`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          },
          data: { force: true }
        }
      );

      return {
        content: [{
          type: "text",
          text: `✅ Order ID ${response.data.id} deleted successfully.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error deleting order: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "deleteCouponById",
  {
    id: z.number()
  },
  async ({ id }) => {
    console.log("🗑️ deleteCouponById called at", new Date().toISOString(), "for ID:", id);

    try {
      const response = await axios.delete(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/coupons/${id}`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          },
          data: { force: true }
        }
      );

      return {
        content: [{
          type: "text",
          text: `✅ Coupon ID ${response.data.id} (${response.data.code}) deleted successfully.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error deleting coupon: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "createProductReview",
  {
    product_id: z.number(),
    review: z.string(),
    reviewer: z.string(),
    reviewer_email: z.string().email(),
    rating: z.number().min(1).max(5)
  },
  async ({ product_id, review, reviewer, reviewer_email, rating }) => {
    console.log("📝 createProductReview called at", new Date().toISOString());

    const reviewKey = `${product_id}-${reviewer_email}-${review.slice(0, 20)}`;
    if (recentToolCalls.has(reviewKey)) {
      return {
        content: [{
          type: "text",
          text: "⚠️ Duplicate review request in progress or just submitted. Please wait."
        }]
      };
    }
    recentToolCalls.add(reviewKey);
    setTimeout(() => recentToolCalls.delete(reviewKey), 10000);

    try {
      const reviewData = {
        product_id,
        review,
        reviewer,
        reviewer_email,
        rating
      };

      const response = await axios.post(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/products/reviews`,
        reviewData,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      return {
        content: [{
          type: "text",
          text: `✅ Review submitted successfully! Review ID: ${response.data.id}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error creating review: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "getReviewsByProductId",
  {
    product_id: z.number()
  },
  async ({ product_id }) => {
    console.log("🔍 getReviewsByProductId called at", new Date().toISOString(), "for product:", product_id);

    try {
      const response = await axios.get(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/products/reviews`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          },
          params: {
            product: product_id
          }
        }
      );

      const reviews = response.data;

      if (reviews.length === 0) {
        return {
          content: [{
            type: "text",
            text: `ℹ️ No reviews found for product ID: ${product_id}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text:
            `🗒️ Reviews for Product ID ${product_id}:\n` +
            reviews.map(r =>
              `⭐ ${r.rating} - ${r.reviewer}:\n"${r.review}"`
            ).join("\n\n")
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error fetching reviews: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);

server.tool(
  "getProductById",
  {
    id: z.number()
  },
  async ({ id }) => {
    console.log("🛍️ getProductById called at", new Date().toISOString(), "for ID:", id);

    try {
      const response = await axios.get(
        `${woocommerceConfig.url}/wp-json/${woocommerceConfig.version}/products/${id}`,
        {
          auth: {
            username: woocommerceConfig.consumerKey,
            password: woocommerceConfig.consumerSecret
          }
        }
      );

      const product = response.data;

      return {
        content: [{
          type: "text",
          text:
            `🛒 Product Details:\n` +
            `• ID: ${product.id}\n` +
            `• Name: ${product.name}\n` +
            `• Price: ₹${product.price}\n` +
            `• Status: ${product.status}\n` +
            `• Stock: ${product.stock_quantity ?? "N/A"}\n` +
            `• Type: ${product.type}\n` +
            `• Description: ${product.short_description?.replace(/<[^>]+>/g, '') || "N/A"}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error fetching product: ${error.response?.data?.message || error.message}`
        }]
      };
    }
  }
);



// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
