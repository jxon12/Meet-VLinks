import React from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  tab: "privacy" | "terms";
  setTab: (t: "privacy" | "terms") => void;
};

const PRIVACY_TEXT = `Privacy Policy for "VLinks"
Last Updated: 03/09/2025

Thank you for using "VLinks", created for CodeNection2025 hackathon competition. Your privacy is critically important to us. Since this is a prototype built for a hackathon, we want to be completely transparent about what we do and do not do with your information.

1. Information We Do NOT Collect

We are built with privacy first. We do NOT collect, store, or transmit any of your personal health data, journal entries, mood check-in results, or any other personally identifiable information (PII) to our servers or any third parties.

2. Information We Do Collect (Anonymous & Local)

Anonymous Usage Data: We may use simple analytics (like Expo or Firebase Analytics) to understand how users interact with the App. This data is anonymous, aggregated, and cannot be used to identify you. It includes information like screen views, button taps, and session length. This helps us improve the app's design and functionality.
Data Stored Only on Your Device: All your personal data, including your journal entries, mood logs, and assessment results, is stored only locally on your device(using AsyncStorage, SQLite, or similar). It never leaves your phone unless you explicitly share it yourself (e.g., exporting a PDF report).

3. How We Use Information

To provide and maintain the core functionality of the App.
To analyze anonymous, aggregated usage data to improve the user experience for future iterations.
To understand the effectiveness of features for our hackathon demonstration.

4. Data Security

Your data is secure because it never leaves your device. We rely on the built-in security features of your operating system (iOS or Android) to protect local data storage.

5. Changes to This Privacy Policy

We may update this policy for the hackathon project. Any changes will be posted on this page with an updated "Last Updated" date.

6. Contact Us

This app is a student project and is not a commercially licensed product. If you have any questions about this Privacy Policy, please contact our team at vlinks4you@gmail.com.
`;

const TERMS_TEXT = `Terms of Service for "VLinks"

Last Updated: 03/09/2025

Please read these Terms of Service ("Terms") carefully before using the "VLinks" app , a prototype created for CodeNection2025 hackathon competition.

1. Acceptance of Terms

By using the App, you agree to be bound by these Terms. If you do not agree, please do not use the App.

2. Health Disclaimer (Very Important!)

THE APP IS A PROTOTYPE CREATED FOR A HACKATHON AND IS NOT A MEDICAL OR HEALTHCARE DEVICE. IT IS PROVIDED FOR INFORMATIONAL, SELF-HELP, AND EDUCATIONAL PURPOSES ONLY.

IT IS NOT INTENDED TO DIAGNOSE, TREAT, CURE, OR PREVENT ANY DISEASE OR MENTAL HEALTH CONDITION. THE CONTENT WITHIN THE APP (ARTICLES, MOOD TRACKING, ETC.) IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT.

ALWAYS SEEK THE ADVICE OF YOUR PHYSICIAN, THERAPIST, OR OTHER QUALIFIED HEALTH PROVIDER WITH ANY QUESTIONS YOU MAY HAVE REGARDING A MEDICAL OR MENTAL HEALTH CONDITION. NEVER DISREGARD PROFESSIONAL MEDICAL ADVICE OR DELAY IN SEEKING IT BECAUSE OF SOMETHING YOU HAVE READ OR USED WITHIN THIS APP.

3. License to Us

We grant you a limited, non-exclusive, non-transferable license to use the App for your personal, non-commercial use.

4. User Responsibilities

You are responsible for maintaining the confidentiality of your device. Since all your data is stored locally, anyone with access to your phone may be able to see it.

5. No Warranty

The App is provided "AS IS" and "AS AVAILABLE," without any warranties of any kind, express or implied. We do not guarantee the app will be uninterrupted or error-free.

6. Limitation of Liability

To the fullest extent permitted by law, our team and hackathon organizers shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the App.

7. Changes to Terms

We may update these Terms for the purposes of the hackathon project. Continued use of the App signifies your acceptance of any revised terms.

8. Contact Information

For any questions about these Terms, please contact us at vlinks4you@gmail.com`;

export default function LegalModal({ open, onClose, tab, setTab }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,820px)] max-h-[85vh] rounded-2xl border border-white/15 bg-[rgba(10,15,25,0.9)] backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15">
            <button
              onClick={() => setTab("privacy")}
              className={`px-3 h-8 rounded-lg text-sm ${
                tab === "privacy" ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setTab("terms")}
              className={`ml-1 px-3 h-8 rounded-lg text-sm ${
                tab === "terms" ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
              }`}
            >
              Terms of Service
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 56px)" }}>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {tab === "privacy" ? PRIVACY_TEXT : TERMS_TEXT}
          </pre>
        </div>
      </div>
    </div>
  );
}
