export const metadata = {
  title: "Privacy Policy - Cakeculator",
  description: "Privacy policy for the Cakeculator streaming history analyzer",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text,#000)] p-6 sm:p-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 opacity-75">Last updated: February 2025</p>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Overview</h2>
          <p>
            Cakeculator is a client-side streaming history analyzer. Your data is processed
            entirely in your browser. We do not collect, store, or transmit your streaming
            history to any server.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Data Processing</h2>
          <p>
            When you upload your Spotify extended streaming history files, all processing
            happens locally in your browser. Your listening data never leaves your device
            unless you explicitly choose to use the Google Drive sync feature.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Google Drive Integration</h2>
          <p>
            If you choose to use the optional Google Drive sync feature, Cakeculator will
            request access to create and manage files in a dedicated app folder on your
            Google Drive. This is used solely to save and load your streaming data for
            cross-device access. We do not access any other files on your Google Drive.
          </p>
          <p className="mt-2">
            The Google Drive integration uses the following scope:
          </p>
          <ul className="list-disc ml-6 mt-1">
            <li><code>drive.appdata</code> &mdash; access only to app-specific data in your Google Drive</li>
          </ul>
          <p className="mt-2">
            You can revoke this access at any time through your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Account permissions
            </a>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Local Storage</h2>
          <p>
            Cakeculator uses your browser's local storage to save preferences and settings
            (such as omitted tracks, theme preferences, and display options). This data
            stays on your device and is not transmitted anywhere.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Analytics</h2>
          <p>
            We use Vercel Analytics to collect anonymous usage statistics (page views, basic
            performance metrics). No personal data or streaming history is included in these
            analytics.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Third-Party Services</h2>
          <p>
            Cakeculator does not sell, share, or transfer your data to any third party.
            The only external services used are:
          </p>
          <ul className="list-disc ml-6 mt-1">
            <li>Google Drive API (optional, user-initiated sync only)</li>
            <li>Vercel Analytics (anonymous usage metrics)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Contact</h2>
          <p>
            If you have questions about this privacy policy, please open an issue on our{" "}
            <a
              href="https://github.com/Fauxdono/streaming-history"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GitHub repository
            </a>.
          </p>
        </div>
      </section>
    </main>
  );
}
