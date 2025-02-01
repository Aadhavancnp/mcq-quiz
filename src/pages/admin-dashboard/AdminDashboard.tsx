import {useState, useEffect} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {useToast} from "@/hooks/use-toast"
import axios from "axios"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog.tsx";
import {User} from "@/types/User.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Loader2, Search} from "lucide-react";

interface Report {
    id: string
    userId: string
    quizId: string
    score: number
    date: string
}

interface Quiz {
    id: string
    questions: Array<{
        question: string
        options: string[]
        answer: number
        category: string
    }>
}

export default function AdminDashboard() {
    const [prompt, setPrompt] = useState("")
    const [quizLink, setQuizLink] = useState("")
    const [users, setUsers] = useState<User[]>([])
    const [reports, setReports] = useState<Report[]>([])
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [newUser, setNewUser] = useState<Omit<User, "id"> & {
        password: string
    }>({name: "", email: "", role: "user", password: ""})

    const {toast} = useToast()

    useEffect(() => {
        fetchUsers()
        fetchReports()
        fetchQuizzes()
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:5000/api/users")
            const data = response.data
            const users: User[] = data.map((user: any) => ({
                id: user["_id"],
                name: user.name,
                email: user.email,
                role: user.role,
            }))
            setUsers(users)
        } catch (error) {
            console.error("Error fetching users:", error)
            toast({
                title: "Error",
                description: "Failed to fetch users",
                variant: "destructive",
            })
        }
    }

    const fetchReports = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:5000/api/reports")
            const data = response.data
            const reports: Report[] = data.map((report: any) => ({
                id: report["_id"],
                userId: report.userId,
                quizId: report.quizId,
                score: report.score,
                date: report.date,
            }))
            setReports(reports)
        } catch (error) {
            console.error("Error fetching reports:", error)
            toast({
                title: "Error",
                description: "Failed to fetch reports",
                variant: "destructive",
            })
        }
    }

    const fetchQuizzes = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:5000/api/quizzes")
            const quizzes = response.data
            const formattedQuizzes = quizzes.map((quiz: any) => ({
                ...quiz,
                questions: JSON.parse(quiz.questions),
            }))
            setQuizzes(formattedQuizzes)
        } catch (error) {
            console.error("Error fetching quizzes:", error)
            toast({
                title: "Error",
                description: "Failed to fetch quizzes",
                variant: "destructive",
            })
        }
    }

    const generateQuiz = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await axios.post("http://127.0.0.1:5000/api/generate-quiz", {prompt})
            const quizCode = response.data.quiz_code
            setQuizLink(`${window.location.origin}/quiz/${quizCode}`)
            toast({
                title: "Quiz generated successfully",
                description: "Share the link with participants.",
            })
            await fetchQuizzes() // Refresh the quizzes list
        } catch (error) {
            console.error("Error generating quiz:", error)
            toast({
                title: "Error",
                description: "Failed to generate quiz",
                variant: "destructive",
            })
            setError("Failed to generate quiz. Please try again.")
        } finally {
            setLoading(false);
        }
    }


    const handleAddUser = async () => {
        try {
            const response = await axios.post("http://127.0.0.1:5000/api/users", newUser)
            const data = response.data
            const newUserWithId: User = {...newUser, id: data.userId}
            setUsers([...users, newUserWithId])
            setNewUser({name: "", email: "", role: "user", password: ""})
            toast({
                title: "User Added",
                description: "New user has been added successfully",
            })
            await fetchUsers() // Refresh the users list
        } catch (error) {
            console.error("Error adding user:", error)
            toast({
                title: "Error",
                description: "Failed to add user",
                variant: "destructive",
            })
        }
    }

    const handleDeleteUser = async (id: string) => {
        try {
            const response = await axios.delete(`http://127.0.0.1:5000/api/users/${id}`)
            const data = response.data
            if (!data.success) {
                toast(
                    {
                        title: "Error",
                        description: "Failed to delete user",
                        variant: "destructive",
                    }
                )
            }
            setUsers(users.filter((user) => user.id !== id))
            toast({
                title: "User Deleted",
                description: "User has been deleted successfully",
            })
            await fetchUsers() // Refresh the users list
        } catch (error) {
            console.error("Error deleting user:", error)
            toast({
                title: "Error",
                description: "Failed to delete user",
                variant: "destructive",
            })
        }
    }


    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Generate Quiz</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Enter quiz prompt..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="mb-4"
                    />
                    <Button onClick={generateQuiz} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin"/>
                        ) : (
                            <Search className="h-4 w-4"/>
                        )}
                        Generate Quiz
                    </Button>
                    {quizLink && (
                        <div className="mt-4">
                            <p>Quiz Link:</p>
                            <Input value={quizLink} readOnly/>
                        </div>
                    )}
                </CardContent>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="mb-4">Add User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Input
                                    placeholder="Name"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                />
                                <Input
                                    placeholder="Email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                />
                                <Input
                                    placeholder="Password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    type="password"
                                />
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({...newUser, role: e.target.value as User["role"]})}
                                    className="border p-2 rounded"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <Button onClick={handleAddUser}>Add User</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quiz Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Quiz ID</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.userId}</TableCell>
                                    <TableCell>{report.quizId}</TableCell>
                                    <TableCell>{report.score}</TableCell>
                                    <TableCell>{report.date}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Generated Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quiz ID</TableHead>
                                <TableHead>Number of Questions</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quizzes.map((quiz) => (
                                <TableRow key={quiz.id}>
                                    <TableCell>{quiz.id}</TableCell>
                                    <TableCell>{quiz.questions.length}</TableCell>
                                    <TableCell>
                                        <a href={`${window.location.origin}/view/${quiz.id}`} target="_blank"
                                           rel="noopener noreferrer">
                                            <Button>View Quiz</Button>
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

