import { render } from "solid-js/web";
import { App } from "../../src/options/App";
import "../../src/options/styles.css";

const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
}
