// src/mirage/server.js
import { createServer, Model, Response } from "miragejs";

export function makeServer({ environment = "development" } = {}) {
  return createServer({
    environment,
    models: {
      product: Model,
      cartItem: Model,
    },

    seeds(server) {
      // create 20 products with random 8-char IDs
      for (let i = 1; i <= 20; i++) {
        const id = Math.random().toString(36).slice(2, 10);
        server.create("product", {
          id,
          name: `Product ${id}`,
          short_description: `<p>Details for ${id}</p>`,
          formatted_price: `$${(i * 5).toFixed(2)}`,
          base_image: {
            medium_image_url: `https://via.placeholder.com/300?text=${id}`,
          },
        });
      }
    },

    routes() {
      // ── Catalog under /api/v2 ─────────────────────────────────────────────
      this.namespace = "api/v2";

      this.get("/products", (schema, req) => {
        const all = schema.products.all().models.map((m) => m.attrs);
        const limit = Number(req.queryParams.limit) || 36;
        const page = Number(req.queryParams.page) || 1;
        const start = (page - 1) * limit;
        return {
          data: all.slice(start, start + limit),
          meta: { total: all.length },
        };
      });

      this.get("/products/:id", (schema, req) => {
        const prod = schema.products.find(req.params.id);
        if (!prod) return new Response(404, {}, { errors: ["Not found"] });
        return { data: prod.attrs };
      });

      // ── Cart & CSRF under /api ─────────────────────────────────────────────
      this.namespace = "api";
      this.timing = 400; // simulate latency

      this.get("/sanctum/csrf-cookie", () => new Response(204));

      this.get("/checkout/cart", (schema) => {
        const items = schema.cartItems.all().models.map((m) => m.attrs);
        const subtotal = items.reduce(
          (sum, i) =>
            sum +
            parseFloat(i.formatted_price.replace(/[^0-9.]/g, "")) * i.quantity,
          0
        );
        return {
          data: items,
          formatted_sub_total: `$${subtotal.toFixed(2)}`,
        };
      });

      this.post("/checkout/cart", (schema, request) => {
        const attrs = JSON.parse(request.requestBody);

        // Try primary-key lookup first, then fallback to findBy
        const prod =
          schema.products.find(attrs.product_id) ||
          schema.products.findBy({ id: attrs.product_id });

        if (!prod) {
          return new Response(400, {}, { message: "Product not found" });
        }

        const pi = prod.attrs;
        const item = schema.cartItems.create({
          id: Math.random().toString(36).slice(2, 10),
          quantity: attrs.quantity,
          name: pi.name,
          formatted_price: pi.formatted_price,
          base_image: pi.base_image,
        });
        return { data: item.attrs };
      });

      this.put("/checkout/cart/update", (schema, request) => {
        const { items } = JSON.parse(request.requestBody);
        items.forEach(({ cartItemId, quantity }) => {
          const ci = schema.cartItems.find(cartItemId);
          if (ci) {
            if (quantity > 0) ci.update({ quantity });
            else ci.destroy();
          }
        });
        const all = schema.cartItems.all().models.map((m) => m.attrs);
        const subtotal = all.reduce(
          (sum, i) =>
            sum +
            parseFloat(i.formatted_price.replace(/[^0-9.]/g, "")) * i.quantity,
          0
        );
        return { data: all, formatted_sub_total: `$${subtotal.toFixed(2)}` };
      });

      this.delete("/checkout/cart/remove/:id", (schema, req) => {
        schema.cartItems.find(req.params.id)?.destroy(); 
        return new Response(204);
      });
    },
  });
}
