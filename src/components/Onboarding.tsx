import { EmptyIllustration, LockIcon, SunMark } from './Icon';

export function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding__inner">
        <div className="brand brand--onboarding">
          <SunMark size={22} className="brand__mark" />
          <span className="brand__name">LightTodo</span>
        </div>

        <div className="onboarding__art">
          <EmptyIllustration />
        </div>

        <div className="onboarding__copy">
          <h1 id="onboarding-title">3 秒记下一件事</h1>
          <p className="onboarding__lead">打开即见今天要做什么。</p>
          <p className="onboarding__note">
            <LockIcon size={17} />
            <span>
              不登录、不联网。任务只保存在这台设备上，换机或卸载后无法恢复。
            </span>
          </p>
        </div>

        <button type="button" className="primary-button" onClick={onStart}>
          开始使用
        </button>
        <p className="onboarding__version">轻待办 · V0.1</p>
      </div>
    </div>
  );
}
