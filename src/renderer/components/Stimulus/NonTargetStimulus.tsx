/**
 * Renders a 20×20 black square positioned absolutely at top: 105px and left: 65px.
 *
 * @returns A JSX element: a 20×20 black `div` with CSS `position: absolute` and `top: 105px; left: 65px`.
 */
export function NonTargetStimulus() {
  return (
    <div
      className="absolute bg-black"
      style={{
        width: '20px',
        height: '20px',
        top: '105px',
        left: '65px',
      }}
    />
  );
}
