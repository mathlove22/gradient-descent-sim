import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ComposedChart, ReferenceLine, ReferenceDot } from 'recharts';
import { Play, RotateCcw, Calculator, Pause, StepForward } from 'lucide-react';

// --- Latex Component for Rendering Math Formulas ---
const Latex = ({ formula, className = "" }) => {
  const encoded = encodeURIComponent(`\\large ${formula}`);
  return (
    <img
      src={`https://latex.codecogs.com/svg.latex?${encoded}`}
      alt={formula}
      className={`inline-block align-middle mx-1 ${className}`}
      style={{ maxHeight: '1.5em', width: 'auto' }}
    />
  );
};

const App = () => {
  // --- State for Main Activity ---
  const [dataPoints, setDataPoints] = useState([
    { x: 20, y: 45 }, { x: 22, y: 50 }, { x: 24, y: 55 }, // 이 부분을 원하는 값으로 변경하세요
    { x: 25, y: 60 }, { x: 28, y: 65 }, { x: 30, y: 72 },
    { x: 31, y: 76 }, { x: 33, y: 82 }, { x: 34, y: 85 },
    { x: 35, y: 90 },
  ]);

  const [manualA, setManualA] = useState(1.5);
  const [learningRate, setLearningRate] = useState(0.01);
  const [initialA, setInitialA] = useState(0);
  const iterations = 30;
  const [gdHistory, setGdHistory] = useState([]);

  // --- Animation State ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDetails, setStepDetails] = useState(null);
  const animationRef = useRef(null);

  // --- Calculations ---

  const calculateMSE = (a, data) => {
    if (!data || data.length === 0) return 0;
    const sumSquaredError = data.reduce((acc, point) => {
      const prediction = a * point.x;
      const error = prediction - point.y;
      return acc + (error * error);
    }, 0);
    return sumSquaredError / data.length;
  };

  const calculateGradientDetails = (a, data) => {
    const n = data.length;
    let totalGradientSum = 0;
    const pointGradients = data.map((p, index) => {
      // Chain Rule: dE/da = 2(ax - y) * x
      const prediction = a * p.x;
      const errorTerm = (prediction - p.y);
      const contribution = 2 * errorTerm * p.x;
      totalGradientSum += contribution;

      return {
        id: index + 1,
        x: p.x,
        y: p.y,
        prediction: prediction,
        errorTerm: errorTerm,
        contribution: contribution
      };
    });

    const finalGradient = totalGradientSum / n;
    return { finalGradient, pointGradients };
  };

  // --- Simulation & Animation ---

  const performSingleStep = useCallback(() => {
    let startA = parseFloat(initialA);
    let nextStepIndex = 0;
    let currentHistory = [];

    if (gdHistory.length > 0) {
      startA = manualA;
      nextStepIndex = currentStep + 1;
      currentHistory = gdHistory;
    } else {
      startA = parseFloat(initialA);
      nextStepIndex = 0;
      currentHistory = [];
      setManualA(startA);
    }

    if (nextStepIndex > iterations) return;

    const mse = calculateMSE(startA, dataPoints);
    const { finalGradient, pointGradients } = calculateGradientDetails(startA, dataPoints);

    const newHistoryEntry = {
      step: nextStepIndex,
      a: parseFloat(startA.toFixed(4)),
      mse: parseFloat(mse.toFixed(4)),
      gradient: parseFloat(finalGradient.toFixed(4))
    };

    const newHistory = [...currentHistory, newHistoryEntry];
    setGdHistory(newHistory);
    setStepDetails({ pointGradients, finalGradient, currentA: startA });
    setCurrentStep(nextStepIndex);

    const nextA = startA - parseFloat(learningRate) * finalGradient;
    setManualA(nextA);
  }, [gdHistory, initialA, manualA, currentStep, iterations, dataPoints, learningRate]);

  const startSimulation = () => {
    if (isAnimating) {
      stopSimulation();
      return;
    }
    if (gdHistory.length === 0) {
      setManualA(parseFloat(initialA));
      setCurrentStep(0);
    }
    setIsAnimating(true);
  };

  const stopSimulation = () => {
    setIsAnimating(false);
    if (animationRef.current) clearTimeout(animationRef.current);
  };

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = setTimeout(() => {
        performSingleStep();
      }, 500);
    }
    return () => clearTimeout(animationRef.current);
  }, [isAnimating, performSingleStep]);

  const handleDataChange = (index, field, value) => {
    const newData = [...dataPoints];
    newData[index] = { ...newData[index], [field]: parseFloat(value) || 0 };
    setDataPoints(newData);
    resetSimulation();
  };

  const resetSimulation = () => {
    setGdHistory([]);
    setStepDetails(null);
    stopSimulation();
    setCurrentStep(0);
    setManualA(parseFloat(initialA));
  };

  const resetAll = () => {
    setDataPoints([
      { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 },
      { x: 4, y: 7 }, { x: 5, y: 11 }, { x: 6, y: 11 },
      { x: 7, y: 14 }, { x: 8, y: 17 }, { x: 9, y: 20 },
      { x: 10, y: 21 },
    ]);
    setInitialA(0);
    resetSimulation();
  };

  // --- Chart Data Preparation ---

  const scatterChartData = useMemo(() => {
    const maxX = Math.max(...dataPoints.map(p => p.x)) + 1;
    const lineData = [
      { x: 0, y: 0 },
      { x: maxX, y: manualA * maxX }
    ];
    return { lineData, maxX };
  }, [dataPoints, manualA]);

  const mseCurveData = useMemo(() => {
    const data = [];
    for (let a = -1; a <= 4.5; a += 0.1) {
      data.push({
        a: parseFloat(a.toFixed(2)),
        mse: calculateMSE(a, dataPoints)
      });
    }
    return data;
  }, [dataPoints]);

  const currentMSE = calculateMSE(manualA, dataPoints);
  const currentGradient = calculateGradientDetails(manualA, dataPoints).finalGradient;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-indigo-600 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📐 경사하강법: 미분과 데이터의 연결</h1>
            <p className="text-lg text-gray-600 flex items-center gap-2">
              데이터(이산)에서 오차 함수(연속)로, 그리고 미분을 통한 학습 과정까지.
            </p>
          </div>
        </header>

        {/* 1. Data Input */}
        <section className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
              데이터 설정
            </h2>
            <button onClick={resetAll} className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1">
              <RotateCcw size={14} /> 초기화
            </button>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {dataPoints.map((point, idx) => (
              <div key={idx} className="min-w-[4rem] bg-gray-50 p-2 rounded border border-gray-200 text-center">
                <div className="text-[10px] text-gray-400 mb-1">#{idx + 1}</div>
                <input
                  type="number" value={point.x}
                  onChange={(e) => handleDataChange(idx, 'x', e.target.value)}
                  className="w-full text-center bg-transparent border-b border-blue-200 text-sm font-bold text-blue-600 mb-1 focus:outline-none"
                />
                <input
                  type="number" value={point.y}
                  onChange={(e) => handleDataChange(idx, 'y', e.target.value)}
                  className="w-full text-center bg-transparent border-b border-red-200 text-sm font-bold text-red-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 2. Interactive Visualization */}
        <section className="bg-white p-6 rounded-2xl shadow-lg ring-1 ring-gray-200">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">2</span>
                기울기 <Latex formula="a" />와 오차의 관계 관찰
              </h2>
              <p className="text-gray-600 text-sm">
                슬라이더를 움직이며 <span className="text-red-500 font-bold">잔차(점선)</span>와 <span className="text-purple-600 font-bold">MSE(곡선)</span>의 관계를 확인하세요.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Left Chart */}
            <div className="relative border rounded-xl p-2 bg-gray-50">
              <h3 className="text-center font-bold text-gray-700 mb-2 flex justify-center items-center gap-2">
                데이터와 모델 <Latex formula="y = ax" />
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="x" type="number" domain={[0, 'dataMax+1']} />
                    <YAxis type="number" domain={[0, 'auto']} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={() => null} />
                    <Line data={scatterChartData.lineData} dataKey="y" stroke="#2563eb" strokeWidth={3} dot={false} animationDuration={0} />
                    <Scatter data={dataPoints} fill="#ef4444" shape="circle" />
                    {dataPoints.map((p, i) => (
                      <ReferenceLine key={i} segment={[{ x: p.x, y: p.y }, { x: p.x, y: manualA * p.x }]} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Chart */}
            <div className="relative border rounded-xl p-2 bg-gray-50">
              <h3 className="text-center font-bold text-gray-700 mb-2">오차 함수 (MSE)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mseCurveData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="a" type="number" domain={['dataMin', 'dataMax']} label={{ value: '기울기 a', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'MSE', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mse" stroke="#8b5cf6" strokeWidth={3} dot={false} animationDuration={0} />
                    {/* ReferenceDot을 사용하여 현재 위치 표시 (호환성 문제 해결) */}
                    <ReferenceDot x={manualA} y={currentMSE} r={6} fill="#ef4444" stroke="none" />
                    <ReferenceLine x={manualA} stroke="#ef4444" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Value Badge */}
              <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow border text-right text-xs">
                <div className="text-gray-500">현재 <Latex formula="a" /></div>
                <div className="text-xl font-bold text-blue-600">{manualA.toFixed(2)}</div>
                <div className="mt-1 text-gray-500">MSE</div>
                <div className="text-lg font-bold text-red-500">{currentMSE.toFixed(2)}</div>
                <div className="mt-1 text-gray-500">미분값(Gradient)</div>
                <div className="text-lg font-mono text-purple-700">{currentGradient.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 p-4 rounded-xl flex flex-col items-center">
            <input
              type="range" min="-1" max="4" step="0.05" value={manualA}
              onChange={(e) => {
                stopSimulation();
                setManualA(parseFloat(e.target.value));
              }}
              className="w-full max-w-lg h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="mt-2 text-sm text-blue-800 font-bold flex items-center gap-2">
              <Latex formula={`a = ${manualA.toFixed(2)}`} />
            </span>
          </div>
        </section>

        {/* 3. Auto Learning & Math Breakdown */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-green-500">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <h2 className="text-xl font-bold">미분 계산 시뮬레이션</h2>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-xl mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">초기값 <Latex formula="a_0" /></label>
              <input type="number" value={initialA} onChange={(e) => { setInitialA(e.target.value); resetSimulation(); }} className="w-20 p-2 border rounded shadow-sm text-center" step="0.1" />
            </div>
            <div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">학습률 <Latex formula="\eta" /></label>
                <input type="number" value={learningRate} onChange={(e) => { setLearningRate(e.target.value); resetSimulation(); }} className="w-20 p-2 border rounded shadow-sm text-center" step="0.001" min="0.001" max="1" />
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2 rounded-lg font-bold shadow transition-colors"
              >
                <RotateCcw size={18} /> 시뮬레이션 초기화
              </button>
              <button
                onClick={performSingleStep}
                className="flex items-center gap-2 bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg font-bold shadow transition-colors"
                disabled={isAnimating}
              >
                <StepForward size={18} /> 단계별 실행
              </button>
              <button
                onClick={startSimulation}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow transition-colors text-white ${isAnimating ? 'bg-red-500' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isAnimating ? <><Pause size={18} /> 정지</> : <><Play size={18} /> 자동 실행</>}
              </button>
            </div>
          </div>

          {/* Math & Calculation Breakdown Panel */}
          {stepDetails && (
            <div className="animate-fadeIn space-y-6">

              {/* The Math Formula */}
              <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                <h3 className="text-lg font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <Calculator size={20} /> 미분 계산 해부 (Step {currentStep})
                </h3>

                <div className="grid md:grid-cols-2 gap-8 text-sm">
                  {/* Left: General Formula */}
                  <div>
                    <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">① 미분 공식 (Chain Rule)</h4>
                    <p className="mb-2 text-gray-600 flex items-center gap-1">
                      오차 함수 <Latex formula="E = (ax - y)^2" /> 를 <Latex formula="a" />로 미분합니다.
                    </p>
                    <div className="bg-white p-3 rounded border border-yellow-300 font-mono text-center text-gray-800 space-y-2 flex flex-col items-center justify-center">
                      <div className="text-3xl"> {/* 크기 조정 */}
                        <Latex formula="\displaystyle \frac{\partial E}{\partial a} = 2(ax - y)\cdot x" />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        (단순화된 형태: 오차 × 입력값 × 2)
                      </div>
                    </div>
                  </div>

                  {/* Right: Update Rule */}
                  <div>
                    <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">② 값 업데이트 공식</h4>
                    <p className="mb-2 text-gray-600">구해진 기울기의 반대 방향으로 이동합니다.</p>
                    <div className="bg-white p-3 rounded border border-green-300 font-mono text-center text-gray-800 flex justify-center">
                      <div className="text-3xl"> {/* 크기 조정 */}
                        <Latex formula="\displaystyle a_{new} = a_{old} - \eta \times \frac{\partial E}{\partial a}" />
                      </div>
                    </div>
                    <div className="mt-2 text-center text-xs flex justify-center items-center gap-1">
                      ( <Latex formula="\eta" />: 학습률 {learningRate} )
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Contribution Table */}
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Detailed Table */}
                <div className="lg:col-span-2 border rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-100 p-3 border-b font-bold text-gray-700 flex justify-between items-center">
                    <span>데이터별 미분값 계산 (현재 a = {stepDetails.currentA.toFixed(4)})</span>
                    <span className="text-xs font-normal text-gray-500">전체 데이터 표시</span>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm text-center relative">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-2 bg-gray-50">Data</th>
                          <th className="p-2 bg-gray-50">예측 (<Latex formula="ax" />)</th>
                          <th className="p-2 bg-gray-50">오차 (<Latex formula="ax-y" />)</th>
                          <th className="p-2 bg-gray-50">미분항 (<Latex formula="2(ax-y)x" />)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stepDetails.pointGradients.map((d) => (
                          <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-2 font-mono text-gray-500">({d.x}, {d.y})</td>
                            <td className="p-2 text-blue-600">{d.prediction.toFixed(2)}</td>
                            <td className="p-2 text-red-500">{d.errorTerm.toFixed(2)}</td>
                            <td className="p-2 font-bold font-mono">
                              {d.contribution.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-purple-50 font-bold text-purple-900 sticky bottom-0 z-10 shadow-inner">
                        <tr>
                          <td colSpan="3" className="p-3 text-right bg-purple-50">평균 기울기 (Gradient):</td>
                          <td className="p-3 font-mono text-lg bg-purple-50">{stepDetails.finalGradient.toFixed(4)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Final Calculation Card */}
                <div className="flex flex-col gap-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg flex flex-col justify-center h-full">
                    <h4 className="text-indigo-100 font-bold mb-4 border-b border-indigo-400 pb-2">다음 a값 계산</h4>

                    <div className="space-y-4 font-mono">
                      <div>
                        <span className="text-indigo-200 text-xs block">현재 a</span>
                        <span className="text-2xl font-bold">{stepDetails.currentA.toFixed(4)}</span>
                      </div>

                      <div className="text-center text-xl opacity-80">-</div>

                      <div>
                        <span className="text-indigo-200 text-xs block">학습률 × 평균 기울기</span>
                        <span className="text-lg">
                          {learningRate} × {stepDetails.finalGradient.toFixed(2)}
                        </span>
                        <span className="block text-xl text-yellow-300">
                          = {(learningRate * stepDetails.finalGradient).toFixed(4)}
                        </span>
                      </div>

                      <div className="text-center text-xl opacity-80">↓</div>

                      <div className="bg-white/20 p-3 rounded-lg">
                        <span className="text-indigo-100 text-xs block">다음 a (Next Step)</span>
                        <span className="text-3xl font-bold text-white">
                          {(stepDetails.currentA - learningRate * stepDetails.finalGradient).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Learning Curve (Mini) */}
              <div className="mt-4 border rounded-xl p-4 bg-white">
                <h4 className="text-sm font-bold text-gray-500 mb-2">학습 진행 상황 (MSE)</h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gdHistory}>
                      <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="mse" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default App;