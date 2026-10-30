export const site = {
  name: "SM Foods",
  logo: "/images/logo.png",
  phone: "8056 285 895",
  whatsapp: "https://wa.me/918056285895",
  email: "smfoods2k25@gmail.com",
  address:
    "1/145 Indira Nagar, 1st Street, Santhosapuram, Chennai, TN - 600073",
  facebook: "https://www.facebook.com/profile.php?id=61583891454530",
  instagram:
    "https://www.instagram.com/smfoodsllc?igsh=Y2NqcjR1eHljNm13&utm_source=qr",
};


export const navLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Contact", to: "/contact" },
  { label: "About us", to: "/about" },
  { label: "Track order", to: "/track-order" },
];

export const quickLinks = navLinks;

export const categories = [
  { label: "Ghee", key: "ghee", to: "/products?category=ghee" },
  { label: "Combos", key: "combos", to: "/products?category=combos" },
  { label: "Rice", key: "rice", to: "/products?category=rice" },
  { label: "Natural Jaggery", key: "jaggery", to: "/products?category=jaggery" },
  { label: "Makhana", key: "snacks", to: "/products?category=snacks" },
];

export const policies = [
  { label: "Privacy policy", to: "/policies/privacy-policy" },
  { label: "Return and refund policy", to: "/policies/refund-policy" },
  { label: "Shipping policy", to: "/policies/shipping-policy" },
  { label: "Terms and conditions", to: "/policies/terms-of-service" },
];

export const whyUs = [
  { icon: "payment", title: "100% Payment Secure", text: "UPI/Debit card/Credit card payment available" },
  { icon: "methods", title: "Traditional Methods", text: "We still follow Traditional methods to retain its Nutritional values and maintain Traditional taste." },
  { icon: "fresh", title: "Completely 100% Fresh & Batch Produced", text: "Small Batch Production helps us to maintain the Best Quality" },
  { icon: "quality", title: "Quality Test In Every Batch", text: "Every Batch will undergo Quality test before reach your Kitchen" },
] as const;

export const testimonials = [
  { name: "Kasthuri", role: "Working Professional", text: "I tried Ghee from you! Great Taste. I'm impressed with the granular structure as shown in website." },
  { name: "Ramesh", role: "Working Professional", text: "I have received my order 3L ghee and 1 kg jaggery combo yesterday. Worth for money. Just like homemade ghee." },
  { name: "Sai Priya", role: "Home maker", text: "Received ghee. Rich smell and Taste. My kids now asking for Ghee roast everytime." },
  { name: "Keerthana", role: "Entrepreneur", text: "Great packaging and timely delivery. Ghee taste very good and Rich in Aroma." },
];
