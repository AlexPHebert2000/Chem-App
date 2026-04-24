import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/teacher/DashboardScreen';
import ClassScreen from '../screens/teacher/ClassScreen';
import ChapterScreen from '../screens/teacher/ChapterScreen';
import SectionScreen from '../screens/teacher/SectionScreen';
import CreateQuestionScreen from '../screens/teacher/CreateQuestionScreen';
import QuestionDetailScreen from '../screens/teacher/QuestionDetailScreen';
import QuestionPreviewScreen from '../screens/teacher/QuestionPreviewScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'TEACHER' ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Class" component={ClassScreen} />
          <Stack.Screen name="Chapter" component={ChapterScreen} />
          <Stack.Screen name="Section" component={SectionScreen} />
          <Stack.Screen name="CreateQuestion" component={CreateQuestionScreen} />
          <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
          <Stack.Screen name="QuestionPreview" component={QuestionPreviewScreen} />
        </>
      ) : (
        <Stack.Screen name="Home" component={HomeScreen} />
      )}
    </Stack.Navigator>
  );
}
