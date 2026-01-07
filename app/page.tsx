
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStorage } from "@/components/StorageProvider";
import OnboardingPage from "@/pages/OnboardingPage";
import { UserProfile } from "@/types";

export default function Home() {
  const storage = useStorage();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const p = await storage.getUserProfile();
      if (p) {
        setProfile(p);
        router.push("/today");
      }
      setLoading(false);
    };
    checkProfile();
  }, [storage, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingPage onComplete={(p) => {
      setProfile(p);
      router.push("/today");
    }} />;
  }

  return null;
}
