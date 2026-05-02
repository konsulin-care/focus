/**
 * Renders a fixed-position black square used as the target stimulus.
 *
 * @returns A JSX element: a 20px by 20px black div positioned absolutely at top 25px and left 65px.
 */
export function TargetStimulus() {
  return (
    <div
      className="absolute bg-black"
      style={{
        width: '20px',
        height: '20px',
        top: '25px',
        left: '65px',
      }}
    />
  );
}
