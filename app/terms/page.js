export const metadata = {
  title: "Terms of Service - Cakeculator",
  description: "Terms of service for the Cakeculator streaming history analyzer",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-6 sm:p-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4 opacity-75">Last updated: February 2025</p>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Acceptance of Terms</h2>
          <p>
            By accessing and using Cakeculator, you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the service.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Description of Service</h2>
          <p>
            Cakeculator is a free, client-side web application that analyzes your Spotify
            extended streaming history data. The service processes your data entirely
            within your browser and provides visualizations and statistics about your
            listening habits.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">User Responsibilities</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>You are responsible for obtaining your own streaming data from Spotify</li>
            <li>You must have the right to use and process the data you upload</li>
            <li>You are responsible for any data you choose to sync to Google Drive</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Data and Privacy</h2>
          <p>
            Your streaming data is processed locally in your browser and is not sent to
            our servers. For full details on how your data is handled, please refer to
            our{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Google Drive Integration</h2>
          <p>
            The optional Google Drive sync feature allows you to save your data for
            cross-device access. By using this feature, you also agree to Google's
            Terms of Service. You can disconnect Google Drive access at any time.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Disclaimer of Warranties</h2>
          <p>
            Cakeculator is provided "as is" without warranties of any kind, either
            express or implied. We do not guarantee the accuracy of any statistics,
            visualizations, or analysis produced by the service. The service may
            contain bugs or errors.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Limitation of Liability</h2>
          <p>
            In no event shall Cakeculator or its creators be liable for any damages
            arising from the use or inability to use the service, including but not
            limited to data loss or inaccurate analysis results.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            service after changes constitutes acceptance of the updated terms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Contact</h2>
          <p>
            If you have questions about these terms, please open an issue on our{" "}
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
