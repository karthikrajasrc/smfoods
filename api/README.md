# SM Foods API

The API uses Node.js, Express, MongoDB/Mongoose, Google Sign-In, email/password accounts, and Razorpay.

## Local setup

1. Install Node.js 20 or newer and start a local MongoDB instance, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env` and set your MongoDB URI, Google OAuth Web client ID, Razorpay test credentials, and a random `JWT_SECRET` of at least 32 characters. To enable product images, also set all three Cloudinary values (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`) from the Cloudinary console. Keep the API secret only in `api/.env`; never add it to a `VITE_` variable or expose it in the browser.
3. Set `ADMIN_EMAILS` to a comma-separated allowlist of Google account emails. It is intentionally empty in the example, so no account has admin access until you configure it. Admin access is granted only after Google verifies that email; never expose or accept admin roles from the browser.
4. Install and start the API:

   ```sh
   npm install
   npm run dev
   ```

5. In another terminal, initialize categories and the starter catalog:

   ```sh
   npm run seed
   ```

6. In `ui`, copy `.env.example` to `.env.local`, configure `VITE_GOOGLE_CLIENT_ID` to the same Google client ID, then start Vite with `npm run dev`. The Vite development server proxies `/api` to `http://localhost:4000`.

Google OAuth must be configured for the UI origin. Customers can register and sign in with email/password or Google; passwords are stored as scrypt hashes and account sessions use an HttpOnly cookie. The configured admin account must continue to use its verified Google login. Configure the Razorpay webhook destination as `https://<api-host>/api/payments/razorpay/webhook` and subscribe to `payment.captured`, `refund.processed`, and `refund.failed`. Set its signing secret in `RAZORPAY_WEBHOOK_SECRET`.

The starter catalog uses sample placeholder images and inventory. Replace those through the admin dashboard after signing in with an allowlisted Google account.

## WhatsApp order confirmations

After Razorpay confirms payment, the API sends an approved WhatsApp template message to the customer's checkout WhatsApp number when the customer has explicitly opted in. Create a WhatsApp Business Platform app and configure these API-only environment variables:

- `WHATSAPP_ACCESS_TOKEN`: a valid WhatsApp Cloud API access token with permission to send messages.
- `WHATSAPP_PHONE_NUMBER_ID`: the sending phone number ID from the WhatsApp API setup.
- `WHATSAPP_TEMPLATE_NAME`: the approved utility template name.
- `WHATSAPP_TEMPLATE_LANGUAGE`: the approved template language code (defaults to `en`).
- `WHATSAPP_GRAPH_API_VERSION`: a Graph API version supported by your Meta app (defaults to `v23.0`).
- `WHATSAPP_COUNTRY_CODE`: country calling code for the 10-digit checkout numbers (defaults to `91` for India).

The approved template must have four body placeholders, in this order: customer name, order number, item details, and total amount. For example: `Hi {{1}}, your SM Foods order {{2}} is confirmed. Items: {{3}}. Total paid: {{4}}. Thank you for shopping with us!` Submit it as a utility template and wait for Meta approval. Checkout asks the customer for optional WhatsApp consent; messages are sent only when they opt in. Keep the access token on the API server only; never use a `VITE_` variable. If WhatsApp settings are absent, order confirmation and payment processing still work, but the WhatsApp message is not sent. Admin order records show whether Meta accepted the confirmation request or it failed.

Product image uploads are available to allowlisted admins at `/api/admin/uploads/product-image`. The API accepts JPEG, PNG, and WebP files up to 5 MB, checks the file signature, uploads through the server-side Cloudinary SDK to `smfoods/products`, and stores the returned secure Cloudinary URL on the product document. All three Cloudinary values must be set together; restart the API after changing them.

Home banner images are managed from the admin dashboard. Admins can upload up to three desktop JPEG, PNG, or WebP images (5 MB each) at `/api/admin/uploads/banner-image` and optionally pair each with a separate mobile image. Validated Cloudinary URLs are saved in storefront settings through `PATCH /api/admin/home-banner` and served publicly with `GET /api/settings`; mobile slides fall back to their desktop image when no mobile image is configured.

Products can have multiple package-size variants (`kg`, `g`, `L`, or `ml`), each with its own price, compare-at price, and stock. The product page offers size selection, and the selected variant is validated and priced by the API at checkout; its stock is decremented only after payment is confirmed. Admins can add up to five gallery images: one main image and four side thumbnails. Existing products without variants continue to use their product-level price and stock.

Admins can independently mark products for the Super Deals featured section and the Our Combos home section. Our Combos displays active products with `showInCombos` enabled.

## API overview

- `GET /api/products`, `GET /api/categories`: public active catalog.
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout`: customer registration/login and Google sign-in using an HttpOnly session cookie.
- `POST /api/orders`: guest checkout; product prices and order totals are calculated by the server. Checkout requires separate 10-digit phone and WhatsApp numbers, with an option to use the same number for both.
- New order numbers use a database-backed increasing numeric suffix starting at `1000` (for example, `SM-26-1000`). Existing alphanumeric order numbers remain valid for tracking.
- `GET /api/settings`: delivery charges for every Indian state and union territory in INR, plus configured home banner images. Admins manage all state rates together at `GET`/`PATCH /api/admin/delivery-charge`; checkout requires a selected state, and each new order stores that state's charge with its subtotal and total.
- `POST /api/orders/verify-payment`: verifies Razorpay signature and captured payment before finalizing the order.
- `GET /api/orders/track?orderNumber=SM-26-1000&email=customer@example.com`: returns order status and the dispatch tracking link after verifying the order email.
- `GET /api/orders/track/phone?phone=8056%20285%20895`: lists up to 100 active orders for an exact checkout phone-number match, including orders awaiting dispatch.
- After payment, customers see “Order placed — getting ready.” Only an admin can dispatch the order, and dispatch requires both a tracking ID and secure HTTPS tracking link; these shipment details are returned to customers only after dispatch.
- `/api/admin/*`: Google-authenticated allowlisted admins only; manages products, categories, delivery charge, and order fulfillment.

Existing stores with a previously configured flat delivery charge use that amount as the initial rate for every state and union territory. Once the admin saves per-state rates, those individual rates are used for new orders.

The API validates all environment variables at startup, uses exact-origin CORS and mutation checks, Helmet security headers, bounded JSON bodies, and rate limits. Production requires HTTPS and production-grade MongoDB/Razorpay/Google configuration. `.env` contains secrets and must never be committed.
