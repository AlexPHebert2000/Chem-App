import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Student screens
import DashboardScreen from '../screens/student/DashboardScreen';
import CourseTrailScreen from '../screens/student/CourseTrailScreen';
import SectionScreen from '../screens/student/SectionScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import SettingsScreen from '../screens/student/SettingsScreen';

// Teacher screens
import TeacherHomeScreen from '../screens/teacher/TeacherHomeScreen';
import ClassDetailScreen from '../screens/teacher/ClassDetailScreen';
import ChapterDetailScreen from '../screens/teacher/ChapterDetailScreen';
import QuestionBankScreen from '../screens/teacher/QuestionBankScreen';
import QuestionEditorScreen from '../screens/teacher/QuestionEditorScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'TEACHER' ? (
        <>
          <Stack.Screen name="TeacherHome"    component={TeacherHomeScreen} />
          <Stack.Screen name="ClassDetail"    component={ClassDetailScreen} />
          <Stack.Screen name="ChapterDetail"  component={ChapterDetailScreen} />
          <Stack.Screen name="QuestionBank"   component={QuestionBankScreen} />
          <Stack.Screen name="QuestionEditor" component={QuestionEditorScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard"     component={DashboardScreen} />
          <Stack.Screen name="Trail"         component={CourseTrailScreen} />
          <Stack.Screen name="StudentSection" component={SectionScreen} />
          <Stack.Screen name="Profile"        component={ProfileScreen} />
          <Stack.Screen name="Settings"       component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
