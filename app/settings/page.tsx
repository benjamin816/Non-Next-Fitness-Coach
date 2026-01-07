
"use client";
import SettingsPage from "@/pages/SettingsPage";
import { useRouter } from "next/navigation";
export default function Page() {
  const router = useRouter();
  return <SettingsPage onReset={() => router.push("/")} />;
}
