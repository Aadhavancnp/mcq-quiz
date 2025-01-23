import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate, useSearchParams } from "react-router"
import { CheckCircle2, XCircle, Camera, Mic } from "lucide-react"

 const startMediaStream = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      console.log("Camera and microphone access granted.")
      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      return null
    }
  }
  
   const stopMediaStream = (stream: MediaStream): void => {
    stream.getTracks().forEach((track) => track.stop())
    console.log("Camera and microphone access stopped.")
  }
  
  

export default function CameraCheck() {
  const [isReady, setIsReady] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initializeStream = async () => {
      const stream = await startMediaStream()
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsReady(true)
        setCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled)
        setMicEnabled(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled)
      }
    }

    initializeStream()

    return () => {
      if (streamRef.current) {
        stopMediaStream(streamRef.current)
      }
    }
  }, [])

  const handleStartQuiz = () => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current)
    }
    const category = searchParams.get("category") || "";
    navigate(`/quiz?category=${category}`)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Camera and Microphone Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
              <Camera className="w-8 h-8 mb-2" />
              <h3 className="text-lg font-semibold mb-2">Camera</h3>
              {cameraEnabled ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
              <p>{cameraEnabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow">
              <Mic className="w-8 h-8 mb-2" />
              <h3 className="text-lg font-semibold mb-2">Microphone</h3>
              {micEnabled ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
              <p>{micEnabled ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>
          <Button onClick={handleStartQuiz} disabled={!isReady || !cameraEnabled || !micEnabled}>
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}



