import styles from './progressbar.module.scss';
import { useEffect, useRef, useState } from 'react';

export default function ProgressBar(props) {
  const { progress, onComplete = () => {} } = props;
  const [fakeProgress, setFakeProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimer();
    if (progress === 0) return;
    if (progress === 100) {
      updateFakeTimer(10, 50);
    } else {
      updateFakeTimer();
    }
  }, [progress]);

  useEffect(() => {
    if (fakeProgress >= progress) {
      clearTimer();
    }
    if (fakeProgress >= 100) {
      setTimeout(onComplete, 800);
    }
  }, [fakeProgress]);

  const updateFakeTimer = (step = 1, timeout = 10) => {
    setFakeProgress((ps) => Math.min(100, ps + step));
    timerRef.current = setTimeout(
      () => updateFakeTimer(step, timeout),
      timeout
    );
  };

  const clearTimer = () => {
    if (!timerRef?.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const roundProgress = Math.round(fakeProgress);

  return (
    <div
      className={`${styles.progressBarContainer} ${
        fakeProgress >= 100 ? styles.hide : ''
      }`}
    >
      <div className={styles.progressBarBackground}>
        <div
          className={styles.progressBar}
          style={{
            width: `${fakeProgress}%`,
          }}
        />
        <div className={styles.progressNumber}>{roundProgress}%</div>
      </div>
    </div>
  );
}
