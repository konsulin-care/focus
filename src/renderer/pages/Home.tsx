import { useNavigation } from '../store';

export default function Home() {
  const { setPage } = useNavigation();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">
        F.O.C.U.S. Assessment
      </h1>
      <p className="text-gray-600 mb-6 text-lg">
        F.O.C.U.S. (Following Ongoing Cues Under Structure) is a computer-based
        visual attention task designed to examine how users track and respond to
        ongoing visual cues presented at a fixed pace. This task captures four
        key variables: response time, response time variability, commission
        errors, and omission errors.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-blue-900">Test Duration</h2>
        <p className="text-blue-700">
          The assessment takes approximately <strong>21.6 minutes</strong> to complete.
          During this time, you will see alternating visual stimuli and should respond
          by pressing the button or key when the target stimulus appears.
        </p>
      </div>
      <button
        onClick={() => setPage('test')}
        className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-[#099B9E] transition-colors font-semibold text-lg shadow-sm cursor-pointer"
      >
        Start Test
      </button>
    </div>
  );
}
