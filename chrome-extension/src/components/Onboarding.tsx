import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader, ExternalLink, Terminal } from 'lucide-react';
import { checkAll } from '../utils/nativeHostCheck';

interface OnboardingProps {
  onComplete: (projectPath: string, localhostUrl: string) => void;
}

enum OnboardingStep {
  CHECKING,
  INSTALL_CORE,
  INSTALL_CLAUDE,
  PROJECT_SETUP,
  COMPLETED
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.CHECKING);
  const [coreInstalled, setCoreInstalled] = useState(false);
  const [claudeInstalled, setClaudeInstalled] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [localhostUrl, setLocalhostUrl] = useState('http://localhost:3000');
  const [checking, setChecking] = useState(true);
  const [coreError, setCoreError] = useState<string>('');
  const [claudeError, setClaudeError] = useState<string>('');
  const [copiedNpm, setCopiedNpm] = useState(false);

  useEffect(() => {
    checkEverything();
  }, []);

  const checkEverything = async () => {
    setChecking(true);
    console.log('[Onboarding] Checking everything...');

    const result = await checkAll();
    console.log('[Onboarding] Check result:', result);

    // Check @fronti/core (native host)
    if (result.vscExtension.installed) {
      setCoreInstalled(true);
      setCoreError('');
    } else {
      setCoreInstalled(false);
      setCoreError(result.vscExtension.error || 'Native host not found');
      console.error('[Onboarding] Native host check failed:', result.vscExtension.error);
    }

    // Check Claude Code
    if (result.claudeCode.installed) {
      setClaudeInstalled(true);
      setClaudeError('');
    } else {
      setClaudeInstalled(false);
      setClaudeError(result.claudeCode.error || 'Claude Code not found');
    }

    // Get project path from native host - auto-fill
    if (result.projectPath) {
      setProjectPath(result.projectPath);
      console.log('[Onboarding] Auto-filled project path:', result.projectPath);
    }

    // Determine next step
    if (!result.vscExtension.installed) {
      setCurrentStep(OnboardingStep.INSTALL_CORE);
    } else if (!result.claudeCode.installed) {
      setCurrentStep(OnboardingStep.INSTALL_CLAUDE);
    } else {
      setCurrentStep(OnboardingStep.PROJECT_SETUP);
    }

    setChecking(false);
  };

  const handleCopyNpmCommand = () => {
    navigator.clipboard.writeText('npm install -g @fronti/core');
    setCopiedNpm(true);
    setTimeout(() => setCopiedNpm(false), 2000);
  };

  const handleRecheck = () => {
    setCurrentStep(OnboardingStep.CHECKING);
    checkEverything();
  };

  const handleComplete = () => {
    if (projectPath.trim()) {
      onComplete(projectPath.trim(), localhostUrl.trim());
    }
  };

  const getStepIcon = (isCompleted: boolean, isActive: boolean) => {
    if (isCompleted) {
      return <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />;
    }
    if (isActive && checking) {
      return <Loader size={18} className="text-black flex-shrink-0 mt-0.5 animate-spin" />;
    }
    if (isActive) {
      return <Circle size={18} className="text-black flex-shrink-0 mt-0.5" />;
    }
    return <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />;
  };

  return (
    <div className="flex items-start justify-center min-h-screen bg-white px-6 pt-16 pb-12">
      <div className="max-w-2xl w-full">
        <h1 className="m-0 mb-2 text-[1.75rem] font-semibold text-black tracking-tight">
          Welcome to Fronti
        </h1>
        <p className="m-0 mb-12 text-gray-600 text-[0.9375rem]">
          Let&apos;s get you set up in a few simple steps
        </p>

        <div className="flex flex-col gap-8">
          {/* Step 1: npm package installation */}
          <div className={`transition-opacity duration-200 ${coreInstalled ? 'opacity-40' : ''}`}>
            <div className="flex gap-3 items-start">
              {getStepIcon(coreInstalled, currentStep === OnboardingStep.CHECKING || currentStep === OnboardingStep.INSTALL_CORE)}
              <div className="flex-1">
                <h3 className="m-0 mb-1 text-[0.9375rem] font-medium text-black">
                  Install Fronti Core
                </h3>
                {currentStep === OnboardingStep.CHECKING && !coreInstalled && (
                  <p className="m-0 text-gray-600 text-sm">Checking...</p>
                )}
                {currentStep === OnboardingStep.INSTALL_CORE && (
                  <div className="mt-4">
                    <p className="m-0 mb-3 text-gray-600 text-sm">Run this command in your terminal to install the bridge:</p>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm">
                        <Terminal size={16} className="text-gray-400 flex-shrink-0" />
                        <code className="flex-1 text-black">npm install -g @fronti/core</code>
                      </div>
                      <button
                        onClick={handleCopyNpmCommand}
                        className="px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors bg-white text-black border border-gray-200 hover:bg-gray-50 flex-shrink-0"
                      >
                        {copiedNpm ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <button
                      onClick={handleRecheck}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-opacity bg-black text-white border border-black hover:opacity-80"
                    >
                      Check Again
                    </button>
                  </div>
                )}
                {coreInstalled && <p className="m-0 text-gray-600 text-sm">Installed and ready</p>}
              </div>
            </div>
          </div>

          {/* Step 2: AI Engine - Hide technical details */}
          <div className={`transition-opacity duration-200 ${claudeInstalled ? 'opacity-40' : ''}`}>
            <div className="flex gap-3 items-start">
              {getStepIcon(claudeInstalled, currentStep === OnboardingStep.CHECKING || currentStep === OnboardingStep.INSTALL_CLAUDE)}
              <div className="flex-1">
                <h3 className="m-0 mb-1 text-[0.9375rem] font-medium text-black">
                  Claude Code
                </h3>
                {currentStep === OnboardingStep.CHECKING && !claudeInstalled && (
                  <p className="m-0 text-gray-600 text-sm">Checking...</p>
                )}
                {currentStep === OnboardingStep.INSTALL_CLAUDE && (
                  <div className="mt-4">
                    <p className="m-0 mb-4 text-gray-600 text-sm">Install Claude CLI to power the AI</p>
                    <button
                      onClick={() => window.open('https://docs.anthropic.com/claude-code', '_blank')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-opacity bg-black text-white border border-black hover:opacity-80 mr-2"
                    >
                      <ExternalLink size={14} />
                      Get Claude CLI
                    </button>
                    <button
                      onClick={handleRecheck}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors bg-white text-black border border-gray-200 hover:bg-gray-50"
                    >
                      Check Again
                    </button>
                  </div>
                )}
                {claudeInstalled && <p className="m-0 text-gray-600 text-sm">Ready</p>}
              </div>
            </div>
          </div>

          {/* Step 3: Project Setup */}
          <div>
            <div className="flex gap-3 items-start">
              {getStepIcon(false, currentStep === OnboardingStep.PROJECT_SETUP)}
              <div className="flex-1">
                <h3 className="m-0 mb-1 text-[0.9375rem] font-medium text-black">
                  Project Configuration
                </h3>
                {currentStep === OnboardingStep.PROJECT_SETUP && (
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block mb-1.5 text-sm font-medium text-black">
                        Project Folder Path
                      </label>
                      <input
                        type="text"
                        value={projectPath}
                        onChange={(e) => setProjectPath(e.target.value)}
                        placeholder="C:\Users\project"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm transition-colors box-border bg-white font-inherit focus:outline-none focus:border-black placeholder:text-gray-400"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block mb-1.5 text-sm font-medium text-black">
                        Development Server URL
                      </label>
                      <input
                        type="text"
                        value={localhostUrl}
                        onChange={(e) => setLocalhostUrl(e.target.value)}
                        placeholder="http://localhost:3000"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm transition-colors box-border bg-white font-inherit focus:outline-none focus:border-black placeholder:text-gray-400"
                      />
                    </div>
                    <button
                      onClick={handleComplete}
                      disabled={!projectPath.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-opacity bg-black text-white border border-black mt-4 w-full hover:opacity-80 disabled:opacity-30 disabled:cursor-default"
                    >
                      Start Editing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
