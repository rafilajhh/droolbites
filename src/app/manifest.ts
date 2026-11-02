import type { MetadataRoute } from "next";

/** Lets a phone add the shop to the home screen with its own name, colours and badge. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Droolbites",
    short_name: "Droolbites",
    description: "Soft cookies, fudgy brownies and creamy tiramisu from Surabaya.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6EC",
    theme_color: "#FBF6EC",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
