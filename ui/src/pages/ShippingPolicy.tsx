import { useBrandContact } from "../context/BrandContactContext";

const sectionClass = "mt-10";
const headingClass = "mb-4 text-2xl font-semibold text-paddy";
const paragraphClass = "mt-4 leading-7 text-[#3b3326]";
const listClass = "mt-4 list-disc space-y-3 pl-6 leading-7 text-[#3b3326]";

export default function ShippingPolicy() {
  const { brandContact } = useBrandContact();
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-4xl font-bold text-paddy sm:text-5xl">Shipping Policy</h1>
      </header>

      <p className="mt-8 leading-7 text-[#3b3326]">
        At <strong>SM Foods</strong>, we are committed to delivering fresh, high-quality products right to your doorstep. We aim to provide a smooth, reliable, and hassle-free shipping experience for all our customers, wherever they are in the world.
      </p>

      <section className={sectionClass}>
        <h2 className={headingClass}>1. Worldwide Shipping</h2>
        <p className={paragraphClass}>
          We proudly offer worldwide shipping, allowing customers from across the globe to enjoy our quality food products. Orders are shipped to eligible domestic and international destinations.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>2. Order Processing &amp; Delivery Time</h2>
        <ul className={listClass}>
          <li>Orders are processed within 2–3 business days.</li>
          <li>Our estimated delivery time is <strong>3–5 business days</strong> after dispatch, depending on the destination and courier service.</li>
          <li>International shipments may take additional time due to customs clearance and local delivery procedures.</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>3. Shipping Charges</h2>
        <p className={paragraphClass}>
          Shipping charges, if applicable, will be calculated and displayed during checkout before completing your purchase. Additional customs duties, taxes, or import fees for international orders are the responsibility of the customer.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>4. Order Tracking</h2>
        <p className={paragraphClass}>
          Once your order has been shipped, tracking details will be shared through your registered email address or mobile number, allowing you to track your package.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>5. Delivery Delays</h2>
        <p className={paragraphClass}>
          While we make every effort to deliver orders within the estimated timeframe, unexpected circumstances such as weather conditions, courier delays, customs inspections, or public holidays may occasionally affect delivery schedules.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>6. Incorrect Address</h2>
        <p className={paragraphClass}>
          Customers are responsible for providing accurate shipping details while placing an order. SM Foods will not be responsible for delivery failures caused by incorrect or incomplete addresses.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>7. Damaged or Missing Packages</h2>
        <p className={paragraphClass}>
          If your package arrives damaged, or if any items are missing, please contact our customer support team as soon as possible with your order details and relevant photographs.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>8. Contact Us</h2>
        <p className={paragraphClass}>For any questions or assistance regarding shipping and delivery, please contact us:</p>
        <ul className={listClass}>
          <li><strong>Brand:</strong> SM Foods</li>
          <li><strong>Email:</strong> <a className="text-paddy underline" href={`mailto:${brandContact.email}`}>{brandContact.email}</a></li>
          <li><strong>Location:</strong> {brandContact.address}</li>
        </ul>
        <p className={paragraphClass}>Thank you for choosing SM Foods. We appreciate your trust and look forward to serving you!</p>
      </section>
    </article>
  );
}
