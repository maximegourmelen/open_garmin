import { Link } from 'react-router-dom';
import { Section } from '../../components/ui/Structure';
import { SettingsRow } from './SettingsRow';
import type { SettingsModel } from './settingsModel';

export function HelpAboutSection({ model }: { model: SettingsModel }) {
  const { draft, states, update } = model;
  return (
    <div className="space-y-12">
      <Section heading="Help">
        <div className="-mt-4">
          <SettingsRow label="Welcome" description="Review the three-step introduction.">
            <Link to="/welcome" className="type-body text-accent hover:underline">
              Replay welcome
            </Link>
          </SettingsRow>
          <SettingsRow label="Tour" description="Walk through the Overview again.">
            <Link to="/?tour=1" className="type-body text-accent hover:underline">
              Take the tour
            </Link>
          </SettingsRow>
          <SettingsRow
            label="Page hints"
            description="Show the first-visit guidance on each page again."
            state={states.dismissed_hints}
          >
            <button
              type="button"
              className="type-body text-accent hover:underline disabled:text-text-3"
              onClick={() => update('dismissed_hints', [])}
              disabled={!draft.dismissed_hints.length}
            >
              Reset hints
            </button>
          </SettingsRow>
        </div>
      </Section>
      <Section heading="About">
        <div id="about" className="-mt-4 space-y-3 type-body text-text-2">
          <p>Open Garmin · version 0.1.0 · MIT licence.</p>
          <p>This independent app is not affiliated with, sponsored by or endorsed by Garmin.</p>
          <p>Open Garmin helps you understand your own data. It is not medical advice.</p>
          <Link to="/guide" className="inline-block text-accent hover:underline">
            Read the Guide
          </Link>
        </div>
      </Section>
    </div>
  );
}
