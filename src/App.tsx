import ResetTester from "./pages/ResetTester";

export default function App() {
  const path = window.location.pathname + window.location.hash;
  const isTest =
    window.location.pathname === "/reset-test" ||
    window.location.hash.startsWith("#/reset-test");

  return isTest ? <ResetTester /> : (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b1325",color:"#fff"}}>
      <div style={{textAlign:"center"}}>
        <h2>Reset Test App</h2>
        <p>Open <code>/reset-test</code> to test the flow.</p>
        <p style={{opacity:.7, marginTop:8}}>
          e.g. <code>https://your-domain/reset-test</code> or <code>https://your-domain/#/reset-test</code>
        </p>
      </div>
    </div>
  );
}
