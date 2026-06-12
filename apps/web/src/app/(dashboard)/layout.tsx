import { Sidebar } from "@/components/layout/sidebar";
import { ChatWidget } from "@/components/chat/chat-widget";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen gap-2.5 bg-shell p-0 md:gap-3.5 md:p-3.5">
      <Sidebar />
      <main className="bg-page flex-1 overflow-y-auto rounded-none md:rounded-[36px]">
        <EmailVerificationBanner />
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}
