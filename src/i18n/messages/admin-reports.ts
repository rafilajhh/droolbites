import { defineMessages } from "../config";

type Unit = "day" | "week" | "month";

/** Admin / Sales report: period controls, totals, sales chart, best sellers and the splits, print header. */
export const adminReportsMessages = defineMessages({
  en: {
    metaTitle: "Sales report",
    title: "Sales report",
    sub: "Sales, orders and best sellers for the period you pick.",
    allTime: "ALL TIME",
    periods: {
      label: "Report period",
      today: "Today",
      "7d": "7 days",
      "30d": "30 days",
      month: "This month",
      "last-month": "Last month",
      year: "This year",
      all: "All time",
    },
    custom: {
      label: "Custom dates",
      from: "From",
      to: "To",
      apply: "SHOW",
      invalid: "Those dates can't be shown (a date is wrong or still to come), so this is the last 7 days.",
    },
    actions: {
      print: "PRINT REPORT",
      printLabel: "Print this sales report",
      export: "EXPORT CSV",
      exportLabel: "Download the orders placed in this period as a CSV file",
    },
    print: {
      period: "Period",
      generated: (when: string) => `Generated ${when} WIB`,
    },
    kpi: {
      sales: "Sales",
      salesSub: (items: string, delivery: string) => `${items} products + ${delivery} delivery`,
      orders: "Orders",
      ordersSub: (unpaid: number, cancelled: number) =>
        ["Paid orders", unpaid ? `${unpaid} unpaid` : "", cancelled ? `${cancelled} cancelled` : ""].filter(Boolean).join(" · "),
      average: "Average order value",
      averageSub: "Per paid order",
      itemsSold: "Items sold",
      itemsSoldSub: (n: number) => `Across ${n} ${n === 1 ? "product" : "products"}`,
    },
    chart: {
      title: "Sales over time",
      sub: (unit: Unit) =>
        unit === "day"
          ? "By the day the order was placed"
          : unit === "week"
            ? "By week, Monday to Sunday"
            : "By month",
      best: (unit: Unit) => (unit === "day" ? "Best day" : unit === "week" ? "Best week" : "Best month"),
      columns: (unit: Unit) => (unit === "day" ? "Sales per day" : unit === "week" ? "Sales per week" : "Sales per month"),
      weekOf: (range: string) => `Week ${range}`,
      orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      empty: "No sales in this period.",
    },
    top: {
      title: "Top products",
      sub: "By items sold",
      sold: (n: number) => `${n} sold`,
      empty: "Nothing sold in this period.",
    },
    categories: {
      title: "Sales by category",
      sub: "Product sales, without delivery",
      share: (pct: number) => `${pct}% of product sales`,
      items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
      empty: "Nothing sold in this period.",
    },
    fulfilment: {
      title: "Delivery or pickup",
      sub: "How orders reach the customer",
      orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      share: (pct: number) => `${pct}% of orders`,
      empty: "No sales in this period.",
    },
    payments: {
      title: "Payment methods",
      sub: "How customers paid",
      orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      share: (pct: number) => `${pct}% of orders`,
      empty: "No sales in this period.",
    },
    footnote:
      "Sales are the totals of paid orders (products plus delivery) placed in this period. The customer's payment service fee isn't part of them.",
  },
  id: {
    metaTitle: "Laporan penjualan",
    title: "Laporan penjualan",
    sub: "Penjualan, pesanan dan produk terlaris di periode yang kamu pilih.",
    allTime: "SEPANJANG WAKTU",
    periods: {
      label: "Periode laporan",
      today: "Hari ini",
      "7d": "7 hari",
      "30d": "30 hari",
      month: "Bulan ini",
      "last-month": "Bulan lalu",
      year: "Tahun ini",
      all: "Semua",
    },
    custom: {
      label: "Tanggal pilihan",
      from: "Dari",
      to: "Sampai",
      apply: "TAMPILKAN",
      invalid: "Tanggal itu tidak bisa ditampilkan (salah tulis atau belum terjadi), jadi ini 7 hari terakhir.",
    },
    actions: {
      print: "CETAK LAPORAN",
      printLabel: "Cetak laporan penjualan ini",
      export: "EKSPOR CSV",
      exportLabel: "Unduh pesanan yang dibuat di periode ini sebagai file CSV",
    },
    print: {
      period: "Periode",
      generated: (when: string) => `Dibuat ${when} WIB`,
    },
    kpi: {
      sales: "Penjualan",
      salesSub: (items: string, delivery: string) => `${items} produk + ${delivery} ongkir`,
      orders: "Pesanan",
      ordersSub: (unpaid: number, cancelled: number) =>
        ["Pesanan lunas", unpaid ? `${unpaid} belum dibayar` : "", cancelled ? `${cancelled} dibatalkan` : ""].filter(Boolean).join(" · "),
      average: "Rata-rata nilai pesanan",
      averageSub: "Per pesanan lunas",
      itemsSold: "Item terjual",
      itemsSoldSub: (n: number) => `Dari ${n} produk`,
    },
    chart: {
      title: "Penjualan dari waktu ke waktu",
      sub: (unit: Unit) =>
        unit === "day"
          ? "Menurut hari pesanan dibuat"
          : unit === "week"
            ? "Per minggu, Senin sampai Minggu"
            : "Per bulan",
      best: (unit: Unit) => (unit === "day" ? "Hari terbaik" : unit === "week" ? "Minggu terbaik" : "Bulan terbaik"),
      columns: (unit: Unit) => (unit === "day" ? "Penjualan per hari" : unit === "week" ? "Penjualan per minggu" : "Penjualan per bulan"),
      weekOf: (range: string) => `Minggu ${range}`,
      orders: (n: number) => `${n} pesanan`,
      empty: "Belum ada penjualan di periode ini.",
    },
    top: {
      title: "Produk terlaris",
      sub: "Menurut jumlah terjual",
      sold: (n: number) => `${n} terjual`,
      empty: "Belum ada produk yang terjual di periode ini.",
    },
    categories: {
      title: "Penjualan per kategori",
      sub: "Penjualan produk, tanpa ongkir",
      share: (pct: number) => `${pct}% dari penjualan produk`,
      items: (n: number) => `${n} item`,
      empty: "Belum ada produk yang terjual di periode ini.",
    },
    fulfilment: {
      title: "Diantar atau diambil",
      sub: "Cara pesanan sampai ke pelanggan",
      orders: (n: number) => `${n} pesanan`,
      share: (pct: number) => `${pct}% dari pesanan`,
      empty: "Belum ada penjualan di periode ini.",
    },
    payments: {
      title: "Metode pembayaran",
      sub: "Cara pelanggan membayar",
      orders: (n: number) => `${n} pesanan`,
      share: (pct: number) => `${pct}% dari pesanan`,
      empty: "Belum ada penjualan di periode ini.",
    },
    footnote:
      "Penjualan adalah total pesanan lunas (produk ditambah ongkir) yang dibuat di periode ini. Biaya layanan pembayaran dari pelanggan tidak termasuk.",
  },
});
