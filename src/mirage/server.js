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
      // seed 20 products
      for (let i = 1; i <= 20; i++) {
        server.create("product", {
          id: i,
          name: `Product ${i}`,
          short_description: `<p>Description for product ${i}</p>`,
          formatted_price: `$${(i * 5).toFixed(2)}`,
          base_image: {
            medium_image_url: `https://via.placeholder.com/300?text=Prod+${i}`,
          },
        });
      }
    },

    routes() {
      // catalog under /api/v1
      this.namespace = "api/v1";

      this.get("/products", (schema, request) => {
        let all = schema.products.all().models;
        let limit = Number(request.queryParams.limit) || 12;
        let page = Number(request.queryParams.page) || 1;
        let start = (page - 1) * limit;
        let data = all.slice(start, start + limit);
        return { data, meta: { total: all.length } };
      });

      this.get("/products/:id", (schema, request) => {
        let prod = schema.products.find(request.params.id);
        return { data: prod.attrs };
      });

      // cart under /api
      this.namespace = "api";

      // sanity endpoint only
      this.get("/sanctum/csrf-cookie", () => new Response(204));

      // simple in-memory cart list
      this.get("/checkout/cart", (schema) => {
        return { data: schema.cartItems.all().models.map((m) => m.attrs) };
      });

      this.post("/checkout/cart", (schema, request) => {
        let attrs = JSON.parse(request.requestBody);
        let item = schema.cartItems.create({
          id: Math.random().toString(36).slice(2, 8),
          quantity: attrs.quantity,
          product: schema.products.find(attrs.product_id).attrs,
        });
        return { data: item.attrs };
      });

      this.put("/checkout/cart/update", (schema, request) => {
        let { items } = JSON.parse(request.requestBody);
        items.forEach(({ cartItemId, quantity }) => {
          let ci = schema.cartItems.find(cartItemId);
          if (ci) {
            if (quantity > 0) ci.update({ quantity });
            else ci.destroy();
          }
        });
        return { data: schema.cartItems.all().models.map((m) => m.attrs) };
      });

      this.delete("/checkout/cart/remove/:id", (schema, request) => {
        let id = request.params.id;
        schema.cartItems.find(id)?.destroy();
        return new Response(204);
      });
    },
  });
}
