// src/App.tsx
import ResetTester from "./pages/ResetTester";

export default function App() {
  // 这个测试 App 只有一个页面：/reset-test
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path !== "/reset-test") {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b1325",color:"#fff"}}>
        <div style={{textAlign:"center"}}>
          <h2>Reset Test App</h2>
          <p>Open <code>/reset-test</code> to test the flow.</p>
          <p style={{opacity:.7, marginTop:8}}>
            e.g. <code>https://your-domain/reset-test</code>
          </p>
        </div>
      </div>
    );
  }
  return <ResetTester />;
}
