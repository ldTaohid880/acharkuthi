import type { Metadata } from "next";
import Link from "next/link";
import { BasketView } from "@/components/basket-view";

export const metadata: Metadata = { title: "Basket" };

/** Basket (Basket.dc.html desktop, BasketMobile.dc.html phone). The cart is on the device; prices come from the database. */
export default function BasketPage() {
  return (
    <main className="wrap bk-main page-basket">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Basket</span>
      </nav>
      <div className="bk-head">
        <h1 className="bk-h1" lang="bn">
          আপনার ঝুড়ি
        </h1>
        <p className="bk-sub" lang="bn">
          আপনার পছন্দের আচারগুলো একবার দেখে নিন।
        </p>
      </div>
      <BasketView />
    </main>
  );
}
