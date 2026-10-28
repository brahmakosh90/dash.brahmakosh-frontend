import logo from '../../assets/logo.jpeg';
import '../portal.css';
import { Toasts } from './ui.jsx';

export const AuthShell = (props, { slots }) => (
  <div class="pp-root pp-auth">
    <div class="pp-auth-card pp-card">
      <div class="pp-auth-brand">
        <img src={logo} alt="Brahmakosh" />
        <div><b>Brahmakosh</b><span>{props.area}</span></div>
      </div>
      <h1>{props.title}</h1>
      {props.sub && <p class="pp-muted">{props.sub}</p>}
      {slots.default?.()}
    </div>
    <Toasts />
  </div>
);
AuthShell.props = ['title', 'sub', 'area'];
