import { useNavigation } from '../store';

export default function Test() {
  const { startTest } = useNavigation();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        T.O.V.A. Test
      </h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <p className="text-yellow-800 text-lg mb-4">
          The Test of Variables of Attention (T.O.V.A.) is a visual assessment
          that measures attention and inhibitory control.
        </p>
        <ul className="list-disc list-inside mt-4 text-yellow-800 space-y-2">
          <li>Duration: approximately 21.6 minutes</li>
          <li>Press the button or key when the target stimulus appears</li>
          <li>Do not respond to non-target stimuli</li>
          <li>High-precision timing captures your response accuracy</li>
        </ul>
      </div>

      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Before You Begin</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>Find a quiet, comfortable environment</li>
          <li>Ensure you can see the screen clearly</li>
          <li>You may use either mouse click or spacebar</li>
          <li>The test cannot be paused once started</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startTest}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold rounded-lg transition-colors shadow-lg"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
