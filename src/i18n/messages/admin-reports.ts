import { defineMessages } from "../config";

type Unit = "day" | "week" | "month";

/** Admin / Sales report: period controls, totals, revenue chart, best sellers and the splits, print header. */
export const adminReportsMessages = defineMessages({
  en: {
    metaTitle: "Sales report",
    title: "Sales report",
    sub: "Revenue and best sellers, counted in Surabaya time (WIB).",
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
      revenue: "Revenue",
      revenueSub: (items: string, delivery: string) => `${items} items + ${delivery} delivery`,
      demoIncluded: (amount: string, n: number) => `Incl. ${amount} in demo payments (${n} ${n === 1 ? "order" : "orders"})`,
      paidOrders: "Paid orders",
      paidOrdersSub: "Orders the store cancelled aren't counted",
      average: "Average order",
      averageSub: "Revenue divided by paid orders",
      itemsSold: "Items sold",
      itemsSoldSub: (n: number) => `Across ${n} ${n === 1 ? "product" : "products"}`,
    },
    notCounted: {
      title: "Not counted as revenue",
      awaiting: "Awaiting payment",
      awaitingSub: "Placed but not paid yet",
      expired: "Payment failed",
      expiredSub: "Payment window closed",
      cancelled: "Cancelled by the store",
      cancelledSub: (paid: number) =>
        paid === 0 ? "None of them were paid" : `${paid} of them ${paid === 1 ? "was" : "were"} paid (refund)`,
    },
    chart: {
      title: "Revenue over time",
      sub: (unit: Unit) =>
        unit === "day"
          ? "Paid orders by the day they were placed"
          : unit === "week"
            ? "Paid orders by week placed (Monday to Sunday)"
            : "Paid orders by month placed",
      best: (unit: Unit) => (unit === "day" ? "Best day" : unit === "week" ? "Best week" : "Best month"),
      columns: (unit: Unit) => (unit === "day" ? "Revenue per day" : unit === "week" ? "Revenue per week" : "Revenue per month"),
      weekOf: (range: string) => `Week ${range}`,
      orders: (n: number) => `${n} paid ${n === 1 ? "order" : "orders"}`,
      empty: "No paid orders in this period yet.",
    },
    top: {
      title: "Top products",
      sub: "Most items sold, then highest revenue",
      sold: (n: number) => `${n} sold`,
      empty: "Nothing sold in this period yet.",
    },
    categories: {
      title: "Revenue by category",
      sub: "Item sales, before delivery fees",
      share: (pct: number) => `${pct}% of item sales`,
      items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
      empty: "No category sales in this period yet.",
    },
    fulfilment: {
      title: "Delivery or pickup",
      sub: "Paid orders by how they reach the customer",
      orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      share: (pct: number) => `${pct}% of orders`,
      empty: "No paid orders in this period yet.",
    },
    payments: {
      title: "Payment methods",
      sub: "Paid orders by how they were paid",
      orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      share: (pct: number) => `${pct}% of orders`,
      empty: "No paid orders in this period yet.",
    },
    footnote:
      "Revenue is the order total (items plus delivery) of paid orders placed in this period, leaving out orders the store cancelled. Payment gateway fees aren't included.",
  },
  id: {
    metaTitle: "Laporan penjualan",
    title: "Laporan penjualan",
    sub: "Pendapatan dan produk terlaris, dihitung dalam waktu Surabaya (WIB).",
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
      revenue: "Pendapatan",
      revenueSub: (items: string, delivery: string) => `${items} produk + ${delivery} ongkir`,
      demoIncluded: (amount: string, n: number) => `Termasuk ${amount} pembayaran demo (${n} pesanan)`,
      paidOrders: "Pesanan lunas",
      paidOrdersSub: "Pesanan yang dibatalkan toko tidak dihitung",
      average: "Rata-rata pesanan",
      averageSub: "Pendapatan dibagi jumlah pesanan lunas",
      itemsSold: "Item terjual",
      itemsSoldSub: (n: number) => `Dari ${n} produk`,
    },
    notCounted: {
      title: "Tidak dihitung sebagai pendapatan",
      awaiting: "Menunggu pembayaran",
      awaitingSub: "Sudah dipesan, belum dibayar",
      expired: "Pembayaran gagal",
      expiredSub: "Batas waktu pembayaran habis",
      cancelled: "Dibatalkan toko",
      cancelledSub: (paid: number) => (paid === 0 ? "Tidak ada yang sudah dibayar" : `${paid} di antaranya sudah dibayar (perlu refund)`),
    },
    chart: {
      title: "Pendapatan dari waktu ke waktu",
      sub: (unit: Unit) =>
        unit === "day"
          ? "Pesanan lunas, menurut hari pesanan dibuat"
          : unit === "week"
            ? "Pesanan lunas, per minggu (Senin sampai Minggu)"
            : "Pesanan lunas, per bulan",
      best: (unit: Unit) => (unit === "day" ? "Hari terbaik" : unit === "week" ? "Minggu terbaik" : "Bulan terbaik"),
      columns: (unit: Unit) => (unit === "day" ? "Pendapatan per hari" : unit === "week" ? "Pendapatan per minggu" : "Pendapatan per bulan"),
      weekOf: (range: string) => `Minggu ${range}`,
      orders: (n: number) => `${n} pesanan lunas`,
      empty: "Belum ada pesanan lunas di periode ini.",
    },
    top: {
      title: "Produk terlaris",
      sub: "Paling banyak terjual, lalu pendapatan tertinggi",
      sold: (n: number) => `${n} terjual`,
      empty: "Belum ada produk yang terjual di periode ini.",
    },
    categories: {
      title: "Pendapatan per kategori",
      sub: "Penjualan produk, belum termasuk ongkir",
      share: (pct: number) => `${pct}% dari penjualan produk`,
      items: (n: number) => `${n} item`,
      empty: "Belum ada penjualan per kategori di periode ini.",
    },
    fulfilment: {
      title: "Diantar atau diambil",
      sub: "Pesanan lunas, menurut cara sampai ke pelanggan",
      orders: (n: number) => `${n} pesanan`,
      share: (pct: number) => `${pct}% dari pesanan`,
      empty: "Belum ada pesanan lunas di periode ini.",
    },
    payments: {
      title: "Metode pembayaran",
      sub: "Pesanan lunas, menurut cara pembayarannya",
      orders: (n: number) => `${n} pesanan`,
      share: (pct: number) => `${pct}% dari pesanan`,
      empty: "Belum ada pesanan lunas di periode ini.",
    },
    footnote:
      "Pendapatan adalah total pesanan (produk ditambah ongkir) dari pesanan lunas yang dibuat di periode ini, tanpa pesanan yang dibatalkan toko. Biaya payment gateway tidak termasuk.",
  },
});
