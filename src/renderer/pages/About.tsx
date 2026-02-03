import { useNavigation } from '../store';

export default function About() {
  const { setPage } = useNavigation();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        About F.O.C.U.S. Attention
      </h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Application Information
        </h2>
        <div className="space-y-2 text-gray-600">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Build:</strong> Electron 40.1.0 / React 18.2</p>
          <p><strong>Platform:</strong> Desktop Application</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          About the F.O.C.U.S. Test
        </h2>
        <p className="text-gray-600 mb-4">
          The Following Ongoing Cues Under Structure (F.O.C.U.S.) is a computerized visual
          continuous performance test used to assess attention and inhibitory control.
          It is widely used in the diagnosis and monitoring of attention disorders
          such as ADHD.
        </p>
        <p className="text-gray-600">
          The test measures four key variables: Response Time, Response Time
          Variability, Commission Errors (false alarms), and Omission Errors
          (missed targets).
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Technical Features
        </h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>High-precision timing (±1ms accuracy)</li>
          <li>Local test execution (no network dependency during test)</li>
          <li>Secure local data storage with automatic upload</li>
          <li>Cross-platform support (Windows, macOS, Linux)</li>
          <li>FHIR-compliant result storage</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Support & Contact
        </h2>
        <p className="text-gray-600 mb-2">
          For technical support or questions about the F.O.C.U.S. Attention assessment,
          please contact your healthcare provider or system administrator.
        </p>
        <p className="text-gray-600">
          <strong>Email:</strong> hello@konsulin.care
        </p>
      </div>

      <button
        onClick={() => setPage('home')}
        className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
      >
        Back to Home
      </button>
    </div>
  );
}
