import "./style.css";
import type { ReactNode } from "react";
export const metadata = {
  title: "Daymark — thoughtful scheduling",
  description: "A calm home for your scheduling work.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
