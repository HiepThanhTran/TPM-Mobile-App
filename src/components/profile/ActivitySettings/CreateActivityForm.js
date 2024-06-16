import { AntDesign, Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import APIs, { authAPI, endPoints } from '../../../configs/APIs.js';
import { statusCode } from '../../../configs/Constants.js';
import GlobalStyle from '../../../styles/Style.js';
import { getTokens, refreshAccessToken } from '../../../utils/Utilities.js';
import DismissKeyboard from '../../common/DismissKeyboard.js';
import Loading from '../../common/Loading.js';
import ActivitySettingsFormStyle from './Style.js';

const initalActivity = {
   name: { label: 'Tên hoạt động', value: '', required: true },
   participant: { label: 'Đối tượng', value: '', required: true },
   organizational_form: { label: 'Hình thức', value: 'Onl', required: false },
   location: { label: 'Địa điểm', value: '', required: true },
   point: { label: 'Điểm', value: '', required: true },
   criterion: { label: 'Điều', value: null, required: false },
   start_date: { label: 'Ngày bắt đầu', value: moment(new Date()).format('YYYY-MM-DD'), required: true },
   end_date: { label: 'Ngày kết thúc', value: moment(new Date()).format('YYYY-MM-DD'), required: true },
   faculty: { label: 'Khoa', value: null, required: true },
   semester: { label: 'Học kỳ', value: null, required: true },
   bulletin: { label: 'Bản tin', value: null, required: false },
   image: { label: 'Hình ảnh', value: null, required: false },
   description: { label: 'Mô tả hoạt động', value: '', required: true },
};

const CreateActivityForm = ({ navigation }) => {
   const refEditorDescription = useRef(RichEditor);

   const [activity, setActivity] = useState(initalActivity);
   const [bulletins, setBulletins] = useState([]);
   const [faculties, setFaculties] = useState([]);
   const [semesters, setSemesters] = useState([]);
   const [criterions, setCriterions] = useState([]);
   const [isRendered, setIsRedered] = useState(false);
   const [modalVisible, setModalVisible] = useState(false);

   useEffect(() => {
      navigation.setOptions({
         headerRight: () => (
            <TouchableOpacity
               onPress={handleCreateActivity}
               style={{ ...GlobalStyle.Center, ...GlobalStyle.HeaderButton }}
            >
               <Text style={GlobalStyle.HeaderButtonText}>Tạo</Text>
            </TouchableOpacity>
         ),
      });
   }, [navigation, activity]);

   useEffect(() => {
      const loadCriterions = async () => {
         try {
            let response = await APIs.get(endPoints['criterions']);

            if (response.status === statusCode.HTTP_200_OK) {
               setCriterions(response.data);
            }
         } catch (error) {
            console.error('Criterions:', error);
            Alert.alert('Thông báo', 'Hệ thống đang bận, vui lòng thử lại sau!');
         }
      };

      const loadBulletins = async () => {
         let tempBulletins = [];
         let i = 1;

         try {
            while (true) {
               let response = await APIs.get(endPoints['bulletins'], { params: { page: i } });
               if (response.status === statusCode.HTTP_200_OK) {
                  tempBulletins = [...tempBulletins, ...response.data.results];

                  if (response.data.next === null) break;
                  i++;
               } else {
                  break;
               }
            }
         } catch (error) {
            console.error('Bulletins:', error);
            Alert.alert('Thông báo', 'Hệ thống đang bận, vui lòng thử lại sau!');
         } finally {
            setBulletins(tempBulletins);
         }
      };

      const loadFaculties = async () => {
         let tempFaculties = [];
         let i = 1;

         try {
            while (true) {
               let response = await APIs.get(endPoints['faculty'], { params: { page: i } });
               if (response.status === statusCode.HTTP_200_OK) {
                  tempFaculties = [...tempFaculties, ...response.data.results];

                  if (response.data.next === null) break;
                  i++;
               } else {
                  break;
               }
            }
         } catch (error) {
            console.error('Faculties:', error);
            Alert.alert('Thông báo', 'Hệ thống đang bận, vui lòng thử lại sau!');
         } finally {
            setFaculties(tempFaculties);
         }
      };

      const loadSemester = async () => {
         let tempSemesters = [];
         let i = 1;

         try {
            while (true) {
               let response = await APIs.get(endPoints['semesters'], { params: { page: i } });
               if (response.status === statusCode.HTTP_200_OK) {
                  tempSemesters = [...tempSemesters, ...response.data.results];

                  if (response.data.next === null) break;
                  i++;
               } else {
                  break;
               }
            }
         } catch (error) {
            console.error('Semesters:', error);
            Alert.alert('Thông báo', 'Hệ thống đang bận, vui lòng thử lại sau!');
         } finally {
            setSemesters(tempSemesters);
         }
      };

      const allCriterions = loadCriterions();
      const allBulletins = loadBulletins();
      const allFaculties = loadFaculties();
      const allSemesters = loadSemester();

      const allPromises = Promise.allSettled([allCriterions, allBulletins, allFaculties, allSemesters]);

      allPromises.finally(() => setIsRedered(true));
   }, []);

   const handleCreateActivity = async () => {
      let form = new FormData();
      for (let [key, field] of Object.entries(activity)) {
         if (field.required && !field.value) {
            Alert.alert('Lỗi', `${field.label} không được trống`);
            return;
         }

         if (!field.required && !field.value) {
            continue;
         }

         form.append(key, field.value);
      }

      setModalVisible(true);
      const { accessToken, refreshToken } = await getTokens();
      try {
         let response = await authAPI(accessToken).post(endPoints['activities'], form);

         if (response.status === statusCode.HTTP_201_CREATED) {
            Alert.alert('Thông báo', 'Tạo hoạt động thành công!', [
               {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
               },
            ]);
         }
      } catch (error) {
         if (
            error.response &&
            (error.response.status === statusCode.HTTP_401_UNAUTHORIZED ||
               error.response.status === statusCode.HTTP_403_FORBIDDEN)
         ) {
            const newAccessToken = await refreshAccessToken(refreshToken, dispatch);
            if (newAccessToken) {
               handleUpdateProfile();
            }
         } else {
            console.error(error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo hoạt động');
         }
      } finally {
         setModalVisible(false);
      }
   };

   const updateActivity = (field, value) => {
      setActivity((prevNewActivity) => ({
         ...prevNewActivity,
         [field]: {
            ...prevNewActivity[field],
            value: value,
         },
      }));
   };

   const handleGallerySelection = async () => {
      let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
         Alert.alert('Thông báo', 'Không có quyền truy cập!');
      } else {
         let res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
         });

         if (!res.canceled) {
            updateActivity('image', {
               uri: res.assets[0].uri,
               type: res.assets[0].mimeType,
               name: res.assets[0].fileName,
            });
         }
      }
   };

   const handleStartDateOnChange = (event, selectedDate) =>
      updateActivity('start_date', moment(selectedDate).format('YYYY-MM-DD'));

   const handleEndDateOnChange = (event, selectedDate) =>
      updateActivity('end_date', moment(selectedDate).format('YYYY-MM-DD'));

   const renderStartDatePicker = () => {
      DateTimePickerAndroid.open({
         value: new Date(activity.start_date.value),
         onChange: handleStartDateOnChange,
         mode: 'date',
         is24Hour: true,
         minimumDate: new Date(),
      });
   };

   const renderEndDatePicker = () => {
      DateTimePickerAndroid.open({
         value: new Date(activity.end_date.value),
         onChange: handleEndDateOnChange,
         mode: 'date',
         is24Hour: true,
         minimumDate: new Date(),
      });
   };

   const handleOnPressWithoutFeedback = () => {
      if (refEditorDescription?.current?.isKeyboardOpen) {
         refEditorDescription?.current?.dismissKeyboard();
      }
   };

   if (!isRendered) return <Loading />;

   return (
      <View style={GlobalStyle.BackGround}>
         <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            style={ActivitySettingsFormStyle.FormContainer}
         >
            <DismissKeyboard onPress={handleOnPressWithoutFeedback}>
               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="newspaper" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Tên hoạt động <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <TextInput
                           placeholder="Tên hoạt động"
                           style={ActivitySettingsFormStyle.TextInput}
                           multiline={true}
                           value={activity.name.value}
                           onChangeText={(value) => updateActivity('name', value)}
                        />
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="people" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Đối tượng <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <TextInput
                           placeholder="Đối tượng"
                           style={ActivitySettingsFormStyle.TextInput}
                           value={activity.participant.value}
                           onChangeText={(value) => updateActivity('participant', value)}
                        />
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <AntDesign name="appstore1" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>Hình thức</Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <View style={ActivitySettingsFormStyle.PickerWrapper}>
                           <Picker
                              prompt="Hình thức"
                              selectedValue={activity.organizational_form.value}
                              style={ActivitySettingsFormStyle.Picker}
                              onValueChange={(value) => updateActivity('organizational_form', value)}
                           >
                              <Picker.Item label="Trực tuyến" value="Onl" />
                              <Picker.Item label="Trực tiếp" value="Off" />
                           </Picker>
                        </View>
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="location" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Địa điểm <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <TextInput
                           placeholder="Địa điểm cụ thể"
                           style={ActivitySettingsFormStyle.TextInput}
                           multiline={true}
                           value={activity.location.value}
                           onChangeText={(value) => updateActivity('location', value)}
                        />
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <AntDesign name="star" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Điểm <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <TextInput
                           placeholder="Điểm cộng"
                           style={ActivitySettingsFormStyle.TextInput}
                           value={activity.point.value}
                           keyboardType="numeric"
                           onChangeText={(value) => updateActivity('point', value)}
                        />
                     </View>
                  </View>

                  <View style={{ ...ActivitySettingsFormStyle.InputContainer, marginLeft: 12 }}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="book-sharp" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>Điều</Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <View style={ActivitySettingsFormStyle.PickerWrapper}>
                           <Picker
                              prompt="Điều lệ"
                              selectedValue={activity.criterion.value}
                              style={ActivitySettingsFormStyle.Picker}
                              onValueChange={(value) => updateActivity('criterion', parseInt(value))}
                           >
                              <Picker.Item label="Chọn điều" value="" />
                              {criterions.map((criterion) => (
                                 <Picker.Item key={criterion.id} label={criterion.name} value={criterion.id} />
                              ))}
                           </Picker>
                        </View>
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <AntDesign name="clockcircle" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Ngày bắt đầu <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <TouchableOpacity style={ActivitySettingsFormStyle.InputWrapper} onPress={renderStartDatePicker}>
                        <TextInput
                           editable={false}
                           value={moment(activity.start_date.value).format('DD/MM/YYYY')}
                           style={ActivitySettingsFormStyle.TextInput}
                        />
                     </TouchableOpacity>
                  </View>

                  <View style={{ ...ActivitySettingsFormStyle.InputContainer, marginLeft: 12 }}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <AntDesign name="clockcircle" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Ngày kết thúc <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <TouchableOpacity style={ActivitySettingsFormStyle.InputWrapper} onPress={renderEndDatePicker}>
                        <TextInput
                           editable={false}
                           value={moment(activity.end_date.value).format('DD/MM/YYYY')}
                           style={ActivitySettingsFormStyle.TextInput}
                        />
                     </TouchableOpacity>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="school" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Khoa <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <View style={ActivitySettingsFormStyle.PickerWrapper}>
                           <Picker
                              prompt="Khoa"
                              selectedValue={activity.faculty.value}
                              style={ActivitySettingsFormStyle.Picker}
                              onValueChange={(value) => updateActivity('faculty', parseInt(value))}
                           >
                              <Picker.Item label="Chọn khoa" value="" />
                              {faculties.map((faculty) => (
                                 <Picker.Item key={faculty.id} label={faculty.name} value={faculty.id} />
                              ))}
                           </Picker>
                        </View>
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="color-filter-sharp" size={20} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Học kỳ <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <View style={ActivitySettingsFormStyle.PickerWrapper}>
                           <Picker
                              prompt="Học kỳ"
                              selectedValue={activity.semester.value}
                              style={ActivitySettingsFormStyle.Picker}
                              onValueChange={(value) => updateActivity('semester', parseInt(value))}
                           >
                              <Picker.Item label="Chọn học kỳ" value="" />
                              {semesters.map((semester) => (
                                 <Picker.Item
                                    key={semester.id}
                                    label={`${semester.original_name} - ${semester.academic_year}`}
                                    value={semester.id}
                                 />
                              ))}
                           </Picker>
                        </View>
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>Bản tin</Text>
                     </View>

                     <View style={ActivitySettingsFormStyle.InputWrapper}>
                        <View style={ActivitySettingsFormStyle.PickerWrapper}>
                           <Picker
                              prompt="Bản tin"
                              selectedValue={activity.bulletin.value}
                              style={ActivitySettingsFormStyle.Picker}
                              onValueChange={(value) => updateActivity('bulletin', parseInt(value))}
                           >
                              <Picker.Item label="Chọn bản tin" value="" />
                              {bulletins.map((bulletin) => (
                                 <Picker.Item key={bulletin.id} label={bulletin.name} value={bulletin.id} />
                              ))}
                           </Picker>
                        </View>
                     </View>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Ionicons name="image" size={24} />
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>Hình ảnh</Text>
                     </View>

                     <TouchableOpacity
                        style={ActivitySettingsFormStyle.ImageContainer}
                        onPress={handleGallerySelection}
                     >
                        {activity.image.value ? (
                           <Image
                              source={{
                                 uri:
                                    typeof activity.image.value === 'string'
                                       ? activity.image.value
                                       : activity.image.value.uri,
                              }}
                              style={ActivitySettingsFormStyle.Image}
                           />
                        ) : (
                           <Ionicons name="image-outline" size={40} />
                        )}
                     </TouchableOpacity>
                  </View>
               </View>

               <View style={ActivitySettingsFormStyle.InputRow}>
                  <View style={ActivitySettingsFormStyle.InputContainer}>
                     <View style={ActivitySettingsFormStyle.InputTitle}>
                        <Text style={ActivitySettingsFormStyle.InputTitleText}>
                           Mô tả hoạt động <Text style={{ color: '#ff0000' }}>*</Text>
                        </Text>
                     </View>

                     <RichToolbar
                        editor={refEditorDescription}
                        selectedIconTint="#873c1e"
                        iconTint="#312921"
                        style={ActivitySettingsFormStyle.RichEditorToolbar}
                        actions={[
                           actions.insertImage,
                           actions.setBold,
                           actions.setItalic,
                           actions.insertBulletsList,
                           actions.insertOrderedList,
                           actions.insertLink,
                           actions.keyboard,
                           actions.setStrikethrough,
                           actions.setUnderline,
                           actions.removeFormat,
                           actions.insertVideo,
                           actions.checkboxList,
                           actions.undo,
                           actions.redo,
                        ]}
                     />
                     <View style={ActivitySettingsFormStyle.RichEditor}>
                        <RichEditor
                           ref={refEditorDescription}
                           style={ActivitySettingsFormStyle.TextInput}
                           multiline={true}
                           placeholder="Mô tả hoạt động"
                           androidHardwareAccelerationDisabled={true}
                           onChange={(value) => updateActivity('description', value)}
                           showsVerticalScrollIndicator={false}
                           showsHorizontalScrollIndicator={false}
                        />
                     </View>
                  </View>
               </View>
            </DismissKeyboard>
         </ScrollView>

         <Portal>
            <Modal visible={modalVisible} style={GlobalStyle.Container}>
               <Loading />
            </Modal>
         </Portal>
      </View>
   );
};

export default CreateActivityForm;
