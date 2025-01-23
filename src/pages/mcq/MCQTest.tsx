import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, Mic, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { questions as sample } from "@/constants/constants";
import { useAuth } from "@/auth/AuthContext";
import { formatTime } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Warning } from "@/types/Warning";
import { Progress } from "@/components/ui/progress";
import { TestState } from "@/types/TestState";
import db from "@/lib/db";
import { useNavigate, useSearchParams } from "react-router";
import { Question } from "@/types/Question";

const INITIAL_TIME = 3600; // 1 hour in seconds
const WARNING_LIMIT = 5;
const LOCAL_STORAGE_KEY = "testState";

const MCQTest = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(sample);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showTestAlert, setShowTestAlert] = useState(false);
  const [testAlertContent, setTestAlertContent] = useState({
    title: "",
    description: "",
  });
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME);
  const [timeSpent, setTimeSpent] = useState(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState(
    Array(questions.length).fill(null)
  );
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [totalWarnings, setTotalWarnings] = useState(0);
  const [testTerminated, setTestTerminated] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState({
    title: "",
    description: "",
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [testStartTime] = useState(new Date());
  const [isTracking, setIsTracking] = useState(true);

  const warningsRef = useRef(warnings);
  const timerRef = useRef<number | null>(null);
  const visibilityRef = useRef<(() => void) | null>(null);
  const blurRef = useRef<(() => void) | null>(null);
  const mouseLeaveRef = useRef<(() => void) | null>(null);
  let [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = useCallback(async () => {
    const category = searchParams.get("category") || "";
    if (!category) return;
    try {
      const response: Question[] = await db.questions
        .find({
          selector: {
            category,
          },
        })
        .exec();
      if (response) {
        console.log(response);
        setQuestions(response.sort(() => Math.random() - 0.5)); // Shuffle questions
        setSelectedAnswers(Array(response.length).fill(null));
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    }
  }, [searchParams]);

  const showAlert = (title: string, description: string) => {
    setAlertDialogContent({ title, description });
    setShowAlertDialog(true);
  };

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
      setEndTime(new Date());
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      showAlert("Test Completed", "Your results will be displayed shortly.");
    }
  }, [currentQuestion, questions.length]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }, [currentQuestion]);

  const handleSelectAnswer = useCallback(
    (index: number) => {
      setSelectedAnswers((prev) => {
        const newAnswers = [...prev];
        newAnswers[currentQuestion] = index;
        return newAnswers;
      });
    },
    [currentQuestion]
  );

  const calculateScore = () => {
    return selectedAnswers.reduce(
      (score, answer, index) =>
        answer === questions[index].answer ? score + 1 : score,
      0
    );
  };

  const restartTest = () => {
    clearInterval(timerRef.current as number);
    if (visibilityRef.current)
      document.removeEventListener("visibilitychange", visibilityRef.current);
    if (blurRef.current) window.removeEventListener("blur", blurRef.current);
    if (mouseLeaveRef.current)
      document.removeEventListener("mouseleave", mouseLeaveRef.current);

    setIsTracking(true);
    setTestTerminated(false);
    setShowResults(false);
    setCurrentQuestion(0);
    setSelectedAnswers(Array(questions.length).fill(null));
    setTimeRemaining(INITIAL_TIME);
    setWarnings([]);
    setTotalWarnings(0);
  };

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionsGranted(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setTestAlertContent({
        title: "Permissions Denied",
        description: "Please grant the permissions to continue",
      });
      setShowTestAlert(true);
      setPermissionsGranted(false);
    }
    setShowPermissionDialog(false);
  };

  const terminateTest =() => {
    setTestTerminated(true);
    setIsTracking(false);
    showAlert(
      "Test Terminated",
      "The test has been terminated due to multiple violations of test rules."
    );
  };

  const addWarning = useCallback(
    (message: string) => {
      if (!isTracking) return;
      const newWarning = { id: Date.now(), message };
      setWarnings((prev) => [...prev, newWarning]);
      setTotalWarnings((prev) => {
        const newTotal = prev + 1
        if (newTotal >= WARNING_LIMIT) {
          terminateTest()
        }
        return newTotal
      });
        setTimeout(
        () => setWarnings((prev) => prev.filter((w) => w.id !== newWarning.id)),
        5000
      );
    },
    [isTracking, terminateTest]
  );

  const removeWarning = useCallback((id: number) => {
    setWarnings((prev) => prev.filter((warning) => warning.id !== id));
  }, []);

  const saveState = useCallback(() => {
    const state: TestState = {
      currentQuestion,
      selectedAnswers,
      timeRemaining,
      warnings: warningsRef.current,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [currentQuestion, selectedAnswers, timeRemaining]);

  const loadState = useCallback(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      const state: TestState = JSON.parse(savedState);
      setCurrentQuestion(state.currentQuestion);
      setSelectedAnswers(state.selectedAnswers);
      setTimeRemaining(state.timeRemaining);
      setWarnings(state.warnings);
    }
  }, []);

  // Internet connection handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadState();
    };

    const handleOffline = () => {
      setIsOnline(false);
      saveState();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadState, saveState]);

  // Auto-save state
  useEffect(() => {
    const interval = setInterval(saveState, 5000); // Save every 5 seconds
    return () => clearInterval(interval);
  }, [saveState]);

  useEffect(() => {
    warningsRef.current = warnings;
  }, [warnings]);




  useEffect(() => {
    if (testTerminated) {
      showAlert(
        "Test Terminated",
        "The test has been terminated due to multiple violations of test rules."
      );
    }
  }, [testTerminated]);

  const generatePDFReport = useCallback(() => {
    const doc = new jsPDF();
    const score = calculateScore();
    const completionTime = endTime || new Date();

    // Add title
    doc.setFontSize(16);
    doc.text("Test Report", 14, 15);

    // Add user statistics
    doc.setFontSize(12);
    doc.text("", 14, 20); // Add gap

    // Test Summary Table
    autoTable(doc, {
      head: [["Candidate Email", "Test Start", "Test End", "Score"]],
      body: [
        [
          user?.email || "N/A",
          testStartTime.toLocaleString(),
          completionTime.toLocaleString(),
          `${score} / ${questions.length} (${(
            (score / questions.length) *
            100
          ).toFixed(2)}%)`,
        ],
      ],
      startY: 25,
    });

    // Time and Warnings Table
    autoTable(doc, {
      head: [["Time Spent", "Warnings Received"]],
      body: [
        [`${formatTime(timeSpent)}`, `${totalWarnings} / ${WARNING_LIMIT}`],
      ],
      startY: (doc as any).lastAutoTable.finalY + 10,
    });

    // Questions and Answers Table
    const questionData = questions.map((q, index) => [
      `Q${index + 1}: ${q.question}`,
      selectedAnswers[index] !== null
        ? q.options[selectedAnswers[index]]
        : "Not answered",
      selectedAnswers[index] === q.answer ? "Correct" : "Incorrect",
      q.options[q.answer],
    ]);

    autoTable(doc, {
      head: [["Question", "Your Answer", "Result", "Correct Answer"]],
      body: questionData,
      startY: (doc as any).lastAutoTable.finalY + 10,
      styles: { cellWidth: "wrap" },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
      },
    });

    doc.save(`test-report-${new Date().toISOString()}.pdf`);
  }, [
    questions,
    selectedAnswers,
    testStartTime,
    timeSpent,
    user?.email,
    totalWarnings,
    endTime,
  ]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setPermissionsGranted(true);
      } catch (err) {
        setPermissionsGranted(false);
      }
    };

    if (isAuthenticated) {
      checkPermissions();
    }
  }, [isAuthenticated]);

  // Timer logic
  useEffect(() => {
    if (showResults || testTerminated) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (!endTime) {
        setEndTime(new Date());
      }
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          setShowResults(true);
          setEndTime(new Date());
          showAlert("Time's Up", "The test has ended.");
          return 0;
        }
        return newTime;
      });

      setTimeSpent((prev) => prev + 1);
    }, 1000);

    timerRef.current = timer;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showResults, testTerminated]);

  useEffect(() => {
    if (showResults) {
      // if (visibilityRef.current)
      //   document.removeEventListener("visibilitychange", visibilityRef.current);
      // if (blurRef.current) window.removeEventListener("blur", blurRef.current);
      // if (mouseLeaveRef.current)
      //   document.removeEventListener("mouseleave", mouseLeaveRef.current);
      return;
    }
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addWarning(
          "You have navigated away from the test window. This action has been recorded."
        );
      }
    };

    const handleBlur = () => {
      addWarning("Test window lost focus. This action has been recorded.");
    };

    const handleMouseLeave = () => {
      addWarning("Mouse left the test window. This action has been recorded.");
    };

    // visibilityRef.current = handleVisibilityChange;
    // blurRef.current = handleBlur;
    // mouseLeaveRef.current = handleMouseLeave;

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [addWarning, showResults]);

  useEffect(() => {
    if (totalWarnings >= WARNING_LIMIT && !testTerminated) {
      terminateTest();
    }
  }, [totalWarnings, testTerminated, terminateTest, WARNING_LIMIT]);

  if (testTerminated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Test Terminated</h2>
            <p>
              The test has been terminated due to multiple violations (
              {WARNING_LIMIT}) of test rules.
            </p>
            <Button onClick={restartTest} className="mt-4" variant="outline">
              Restart Test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          {!isOnline && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Offline Mode</AlertTitle>
              <AlertDescription>
                You are currently offline. Your progress will be saved and
                synced when you reconnect.
              </AlertDescription>
            </Alert>
          )}

          {permissionsGranted ? (
            showResults ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Test Results</h2>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <p className="text-4xl font-bold text-primary mb-2">
                      {calculateScore()} / {questions.length}
                    </p>
                    <Progress
                      value={(calculateScore() / questions.length) * 100}
                      className="w-full h-2 mb-4"
                    />
                    <p className="text-gray-600">
                      Time taken: {formatTime(INITIAL_TIME - timeRemaining)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={generatePDFReport} variant="outline">
                    Download Report
                  </Button>
                  <Button onClick={restartTest}>Restart Test</Button>
                  <Button
                    onClick={() => navigate("/")}
                    variant="outline"
                    className="md:col-span-2"
                  >
                    Search
                  </Button>
                  <Button
                    onClick={logout}
                    variant="destructive"
                    className="md:col-span-2"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Camera
                      className={`h-5 w-5 ${
                        permissionsGranted ? "text-green-500" : "text-red-500"
                      }`}
                    />
                    <Mic
                      className={`h-5 w-5 ${
                        permissionsGranted ? "text-green-500" : "text-red-500"
                      }`}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Time Remaining</p>
                    <p className="text-2xl font-bold">
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Progress
                    value={(currentQuestion / questions.length) * 100}
                    className="w-full"
                  />
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-bold mb-4">
                      Question {currentQuestion + 1} of {questions.length}
                    </h3>
                    <p className="mb-6">
                      {questions[currentQuestion].question}
                    </p>
                    <div className="space-y-3">
                      {questions[currentQuestion].options.map(
                        (option, index) => (
                          <Button
                            key={index}
                            variant={
                              selectedAnswers[currentQuestion] === index
                                ? "default"
                                : "outline"
                            }
                            className="w-full justify-start text-left"
                            onClick={() => handleSelectAnswer(index)}
                          >
                            {option}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button onClick={handleNextQuestion} className="ml-4">
                    {currentQuestion < questions.length - 1 ? "Next" : "Finish"}
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="text-center p-6">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold mb-2">
                Camera and Microphone Required
              </h3>
              <p className="text-gray-600 mb-6">
                Please grant access to your camera and microphone to proceed
                with the test.
              </p>
              <Button
                onClick={() => setShowPermissionDialog(true)}
                className="w-full"
              >
                Grant Permissions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showPermissionDialog && (
        <AlertDialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Camera and Microphone Access</AlertDialogTitle>
              <AlertDialogDescription>
                This test requires access to your camera and microphone. Please
                grant permission to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setTestAlertContent({
                    title: "Permissions Denied",
                    description: "Please grant the permissions to continue",
                  });
                  setShowTestAlert(true);
                  setShowPermissionDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={requestPermissions}>
                Grant Permissions
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlertDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showTestAlert} onOpenChange={setShowTestAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{testAlertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {testAlertContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTestAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {warnings.map((warning) => (
        <Alert
          key={warning.id}
          variant="destructive"
          className="fixed top-4 right-4 w-96 animate-in fade-in slide-in-from-right"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>{warning.message}</AlertDescription>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={() => removeWarning(warning.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
};

export default MCQTest;
