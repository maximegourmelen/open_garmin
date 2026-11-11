import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Callout } from '../../components/ui/Structure';

function offered() {
  try {
    return sessionStorage.getItem('og_welcome_tour_offer') === '1';
  } catch {
    return false;
  }
}

export function WelcomeTourOffer() {
  const [visible, setVisible] = useState(offered);
  const navigate = useNavigate();
  if (!visible) return null;
  const close = () => {
    setVisible(false);
    try {
      sessionStorage.removeItem('og_welcome_tour_offer');
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <Callout>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>New here? Take a 1-minute tour of the Overview.</span>
        <button
          type="button"
          className="font-medium text-accent underline"
          onClick={() => {
            close();
            navigate('/?tour=1');
          }}
        >
          Start tour
        </button>
        <button type="button" className="text-text-2 underline" onClick={close}>
          Not now
        </button>
      </div>
    </Callout>
  );
}
