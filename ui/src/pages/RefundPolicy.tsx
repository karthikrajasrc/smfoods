import { useBrandContact } from "../context/BrandContactContext";

const sectionClass = "mt-10";
const headingClass = "mb-4 text-2xl font-semibold text-paddy";
const paragraphClass = "mt-4 leading-7 text-[#3b3326]";

export default function RefundPolicy() {
  const { brandContact } = useBrandContact();
  const emailLink = <a className="text-paddy underline" href={`mailto:${brandContact.email}`}>{brandContact.email}</a>;
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-4xl font-bold text-paddy sm:text-5xl">Return and refund policy</h1>
      </header>

      <section className={sectionClass}>
        <h2 className={headingClass}>Returns</h2>
        <p className="leading-7 text-[#3b3326]">
          We have a 30-day return policy, which means you have 30 days after receiving your item to request a return.
        </p>
        <p className={paragraphClass}>
          To be eligible for a return, your item must be in the same condition that you received it, unworn or unused, with tags, and in its original packaging. You’ll also need the receipt or proof of purchase.
        </p>
        <p className={paragraphClass}>
          To start a return, you can contact us at {emailLink}. Please note that returns will need to be sent to the following address: {brandContact.address}.
        </p>
        <p className={paragraphClass}>
          If your return is accepted, we’ll send you a return shipping label, as well as instructions on how and where to send your package. Items sent back to us without first requesting a return will not be accepted.
        </p>
        <p className={paragraphClass}>You can always contact us for any return question at {emailLink}.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Damages and issues</h2>
        <p className={paragraphClass}>
          Please inspect your order upon reception and contact us immediately if the item is defective, damaged or if you receive the wrong item, so that we can evaluate the issue and make it right.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Exceptions / non-returnable items</h2>
        <p className={paragraphClass}>
          Certain types of items cannot be returned, like perishable goods (such as food, flowers, or plants), custom products (such as special orders or personalized items), and personal care goods (such as beauty products). We also do not accept returns for hazardous materials, flammable liquids, or gases. Please get in touch if you have questions or concerns about your specific item.
        </p>
        <p className={paragraphClass}>Unfortunately, we cannot accept returns on sale items or gift cards.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Exchanges</h2>
        <p className={paragraphClass}>
          The fastest way to ensure you get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>European Union 14 day cooling off period</h2>
        <p className={paragraphClass}>
          Notwithstanding the above, if the merchandise is being shipped into the European Union, you have the right to cancel or return your order within 14 days, for any reason and without a justification. As above, your item must be in the same condition that you received it, unworn or unused, with tags, and in its original packaging. You’ll also need the receipt or proof of purchase.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={headingClass}>Refunds</h2>
        <p className={paragraphClass}>
          We will notify you once we’ve received and inspected your return, and let you know if the refund was approved or not. If approved, you’ll be automatically refunded on your original payment method within 10 business days. Please remember it can take some time for your bank or credit card company to process and post the refund too.
        </p>
        <p className={paragraphClass}>
          If more than 15 business days have passed since we’ve approved your return, please contact us at {emailLink}.
        </p>
      </section>
    </article>
  );
}
