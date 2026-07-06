import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Kitchen from "./pages/Kitchen";
import TV from "./pages/TV";
import Admin from "./pages/Admin";
import Delivery from "./pages/Delivery";

function App() {
return ( <BrowserRouter> <Routes>
<Route path="/" element={<Home />} />
<Route path="/kitchen" element={<Kitchen />} />
<Route path="/tv" element={<TV />} />
<Route path="/delivery" element={<Delivery />} />
<Route path="/admin" element={<Admin />} /> </Routes> </BrowserRouter>
);
}

export default App;
