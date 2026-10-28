import { ref, computed } from 'vue';
import { Field } from './ui.jsx';

// The location dataset is large, so it is fetched only when a screen that uses this component is opened.
const lib = ref(null);
let loading = null;
const loadLib = () => { loading ||= import('country-state-city').then((m) => { lib.value = m; }).catch(() => { loading = null; }); return loading; };
loadLib();

/**
 * Country → State → City selector. `value` is { country, state, city } holding display names.
 * Changing a level clears the levels below it. Where the dataset has no states or cities for a place, a text box is shown instead.
 */
export const LocationFields = (props) => {
  const v = props.value;
  const L = lib.value;
  const countries = computed(() => (L ? L.Country.getAllCountries() : []));
  const country = countries.value.find((c) => c.name === v.country);
  const states = L && country ? L.State.getStatesOfCountry(country.isoCode) : [];
  const st = states.find((s) => s.name === v.state);
  const cities = L && country ? (st ? L.City.getCitiesOfState(country.isoCode, st.isoCode) : states.length ? [] : L.City.getCitiesOfCountry(country.isoCode) || []) : [];
  const set = (patch) => props.onChange({ ...v, ...patch });
  const loadingNote = !L ? 'Loading locations…' : '';

  return (
    <>
      <Field label="Country" error={props.errors?.country} hint={loadingNote}>
        <select class="pp-select" disabled={!L} value={v.country || ''} onChange={(e) => set({ country: e.target.value, state: '', city: '' })} autocomplete="country-name">
          <option value="">Select country</option>
          {v.country && !country && L && <option value={v.country}>{v.country}</option>}
          {countries.value.map((c) => <option key={c.isoCode} value={c.name}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="State / Region" error={props.errors?.state}>
        {states.length ? (
          <select class="pp-select" value={v.state || ''} onChange={(e) => set({ state: e.target.value, city: '' })} autocomplete="address-level1">
            <option value="">Select state</option>
            {v.state && !st && <option value={v.state}>{v.state}</option>}
            {states.map((s) => <option key={s.isoCode} value={s.name}>{s.name}</option>)}
          </select>
        ) : <input class="pp-input" disabled={!v.country} placeholder={v.country ? 'State / region (optional)' : 'Select a country first'} value={v.state || ''} onInput={(e) => set({ state: e.target.value })} autocomplete="address-level1" />}
      </Field>
      <Field label="City" error={props.errors?.city}>
        {cities.length ? (
          <select class="pp-select" value={v.city || ''} onChange={(e) => set({ city: e.target.value })} autocomplete="address-level2">
            <option value="">Select city</option>
            {v.city && !cities.some((c) => c.name === v.city) && <option value={v.city}>{v.city}</option>}
            {cities.map((c, i) => <option key={`${c.name}-${i}`} value={c.name}>{c.name}</option>)}
          </select>
        ) : <input class="pp-input" disabled={!v.country || (states.length > 0 && !v.state)} placeholder={!v.country ? 'Select a country first' : states.length && !v.state ? 'Select a state first' : 'Enter your city'} value={v.city || ''} onInput={(e) => set({ city: e.target.value })} autocomplete="address-level2" />}
      </Field>
    </>
  );
};
LocationFields.props = ['value', 'onChange', 'errors'];
