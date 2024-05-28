import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import mime from 'mime';
import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Icon, Portal, RadioButton, Snackbar, TextInput } from 'react-native-paper';
import Loading from '../../components/Loading';
import { authAPI, endPoints } from '../../configs/APIs';
import { status } from '../../configs/Constants';
import { UpdateAccountAction } from '../../store/actions/AccountAction';
import { useAccount, useAccountDispatch } from '../../store/contexts/AccountContext';
import GlobalStyle from '../../styles/Style';
import Theme from '../../styles/Theme';
import { formatDate, getFirstDayOfMoth, getLastDayOfMoth } from '../../utils/Utilities';
import { EditProfileStyle } from './Style';

const EditProfile = ({ navigation }) => {
    const dispatch = useAccountDispatch();
    const currentAccount = useAccount();

    const [tempAccount, setTempAccount] = useState(currentAccount.data);
    const [snackBarVisible, setSnackBarVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackBarMsg, setSnackBarMsg] = useState('sdfsdf');
    const [canUpdate, setCanUpdate] = useState(false);

    const schoolFields = [
        {
            label: 'Hệ đào tạo',
            name: 'educational_system',
            icon: 'school',
        },
        {
            label: 'Khoa',
            name: 'faculty',
            icon: 'school',
        },
        {
            label: 'Khóa',
            name: 'academic_year',
            icon: 'calendar',
        },
        {
            label: 'Ngành',
            name: 'major',
            icon: 'book-open-page-variant',
        },
        {
            label: 'Lớp',
            name: 'sclass',
            icon: 'account-group',
        },
    ];
    const accountFields = [
        {
            label: 'Email',
            name: 'email',
            value: currentAccount.data.email,
            icon: 'email',
            disabled: true,
        },
        {
            label: `Mã số ${currentAccount.data.original_role.toLowerCase()}`,
            name: 'code',
            value: currentAccount.data.user.code,
            icon: 'badge-account',
            disabled: true,
        },
    ];
    const userFields = [
        {
            label: 'Họ',
            name: 'last_name',
            icon: 'account-eye',
        },
        {
            label: 'Tên đệm',
            name: 'middle_name',
            icon: 'account-eye',
        },
        {
            label: 'Tên',
            name: 'first_name',
            icon: 'account-eye',
        },
        {
            label: 'Địa chỉ',
            name: 'address',
            icon: 'map-marker',
        },
        {
            label: 'Số điện thoại',
            name: 'phone_number',
            icon: 'phone',
            keyboardType: 'numeric',
        },
    ];

    useEffect(() => {
        checkCanUpdate();
        renderHeaderButton();
    }, [navigation, tempAccount, canUpdate]);

    const handleUpdateProfile = async () => {
        let form = new FormData();
        let count = 0;
        if (currentAccount.data.avatar !== tempAccount.avatar) {
            form.append('avatar', {
                uri: tempAccount.avatar.uri,
                type: mime.getType(tempAccount.avatar.uri),
                name: tempAccount.avatar.fileName,
            });
            count++;
        }
        for (let key in tempAccount.user) {
            if (currentAccount.data.user[key] !== tempAccount.user[key]) {
                form.append(key, tempAccount.user[key]);
                count++;
            }
        }

        if (count > 0) {
            setLoading(true);
            setSnackBarVisible(true);
            try {
                const accessToken = await AsyncStorage.getItem('access-token');
                let res = await authAPI(accessToken).patch(endPoints['me-update'], form);

                if (res.status === status.HTTP_200_OK) {
                    dispatch(UpdateAccountAction(res.data));
                    setSnackBarMsg('Cập nhật thành công');
                }
            } catch (error) {
                if (error.response) {
                    console.error('Response:', error.response.data);
                } else {
                    console.error('Error:', error);
                }
                setSnackBarMsg('Có lỗi xảy ra khi cập nhật');
            } finally {
                setLoading(false);
            }
        }
    };

    const updateUserOfTempAccount = (field, value) => {
        setTempAccount((current) => ({
            ...current,
            user: {
                ...current.user,
                [field]: value,
            },
        }));
    };

    const checkCanUpdate = () => {
        let isEdited = currentAccount.data.avatar !== tempAccount.avatar;

        for (let key in tempAccount.user) {
            if (tempAccount.user[key] !== '' && tempAccount.user[key] !== currentAccount.data.user[key]) {
                isEdited = true;
                break;
            }
        }

        setCanUpdate(isEdited);
    };

    const handleSelection = async (requestPermission, launchFunction) => {
        let { status } = await requestPermission();
        if (status !== 'granted') {
            Alert.alert('Thông báo', 'Không có quyền truy cập!');
        } else {
            let res = await launchFunction({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 4],
                quality: 1,
            });

            if (!res.canceled) {
                setTempAccount((current) => ({
                    ...current,
                    avatar: res.assets[0],
                }));
            }
        }
        setModalVisible(false);
    };

    const handleGallerySelection = () =>
        handleSelection(ImagePicker.requestMediaLibraryPermissionsAsync, ImagePicker.launchImageLibraryAsync);

    const handleCameraSelection = () =>
        handleSelection(ImagePicker.requestCameraPermissionsAsync, ImagePicker.launchCameraAsync);

    const handleDatePickerOnChange = (event, selectedDate) => {
        const dateInDesiredFormat = selectedDate.toISOString().split('T')[0];
        updateUserOfTempAccount('date_of_birth', dateInDesiredFormat);
    };

    const renderHeaderButton = () => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    disabled={!canUpdate}
                    onPress={handleUpdateProfile}
                    style={{
                        ...GlobalStyle.Center,
                        ...GlobalStyle.HeaderButton,
                        ...(!canUpdate ? { backgroundColor: 'rgba(52, 52, 52, 0.8)' } : {}),
                    }}
                >
                    <Text style={GlobalStyle.HeaderButtonText}>Cập nhật</Text>
                </TouchableOpacity>
            ),
        });
    };

    const renderDatePicker = () => {
        DateTimePickerAndroid.open({
            value: new Date(tempAccount.user.date_of_birth),
            onChange: handleDatePickerOnChange,
            mode: 'date',
            is24Hour: true,
            minimumDate: getFirstDayOfMoth(new Date(tempAccount.user.date_of_birth)),
            maximumDate: getLastDayOfMoth(new Date(tempAccount.user.date_of_birth)),
        });
    };

    return (
        <View style={GlobalStyle.BackGround}>
            <ScrollView>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
                    <LinearGradient
                        colors={['#3399FF', '#66CCFF', '#99CCFF', '#f1f4ff']}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={EditProfileStyle.AvatarContainer}
                    >
                        <TouchableOpacity activeOpacity={0.5} onPress={() => setModalVisible(true)}>
                            <Image
                                style={EditProfileStyle.Avatar}
                                source={{
                                    uri:
                                        typeof tempAccount.avatar === 'string'
                                            ? tempAccount.avatar
                                            : tempAccount.avatar.uri,
                                }}
                            />
                            <View style={EditProfileStyle.CameraIcon}>
                                <Icon source="camera" color="white" size={24} />
                            </View>
                        </TouchableOpacity>

                        <Text style={EditProfileStyle.FullName}>
                            {currentAccount.data.user.last_name} {currentAccount.data.user.middle_name}{' '}
                            {currentAccount.data.user.first_name}
                        </Text>

                        <Modal
                            animationType="slide"
                            transparent={true}
                            visible={modalVisible}
                            onRequestClose={() => setModalVisible(false)}
                        >
                            <View style={GlobalStyle.ModalContainer}>
                                <View style={GlobalStyle.ModalView}>
                                    <Text style={GlobalStyle.ModalTitle}>Chọn lựa chọn</Text>
                                    <TouchableOpacity style={GlobalStyle.ModalButton} onPress={handleGallerySelection}>
                                        <Text style={GlobalStyle.ModalButtonText}>Thư viện</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={GlobalStyle.ModalButton} onPress={handleCameraSelection}>
                                        <Text style={GlobalStyle.ModalButtonText}>Camera</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={GlobalStyle.ModalButton}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={GlobalStyle.ModalButtonText}>Hủy</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </LinearGradient>

                    <View style={{ ...EditProfileStyle.SchoolContainer, ...EditProfileStyle.SectionContainer }}>
                        <Text style={EditProfileStyle.Header}>Thông tin trường</Text>
                        {schoolFields.map((f) => {
                            const labelT = tempAccount.user[f.name] ? tempAccount.user[f.name] : 'Không có';
                            return (
                                <View key={f.name} style={EditProfileStyle.SchoolItem}>
                                    <Icon color={Theme.PrimaryColor} source={f.icon} size={24} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={EditProfileStyle.SchoolItemText}>{`${f.label}: ${labelT}`}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <View style={{ ...EditProfileStyle.FormContainer, ...EditProfileStyle.SectionContainer }}>
                        <Text style={EditProfileStyle.Header}>Chỉnh sửa thông tin cá nhân</Text>
                        {accountFields.map((f) => (
                            <>
                                <Text style={EditProfileStyle.FormText}>{f.label}</Text>
                                <View style={EditProfileStyle.FormWrap}>
                                    <TextInput
                                        key={f.name}
                                        value={f.value}
                                        disabled={f.disabled}
                                        placeholder={f.label}
                                        style={EditProfileStyle.FormData}
                                        cursorColor={Theme.PrimaryColor}
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                        right={<TextInput.Icon icon={f.icon} />}
                                    />
                                </View>
                            </>
                        ))}
                        {userFields.map((f) => (
                            <>
                                <Text style={EditProfileStyle.FormText}>{f.label}</Text>
                                <View style={EditProfileStyle.FormWrap}>
                                    <TextInput
                                        key={f.name}
                                        value={tempAccount.user[f.name]}
                                        disabled={f.disabled}
                                        placeholder={f.label}
                                        style={EditProfileStyle.FormData}
                                        keyboardType={f.keyboardType}
                                        cursorColor={Theme.PrimaryColor}
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                        onChangeText={(value) => updateUserOfTempAccount(f.name, value)}
                                        right={<TextInput.Icon icon={f.icon} />}
                                    />
                                </View>
                            </>
                        ))}
                        <View>
                            <Text style={EditProfileStyle.FormText}>Giới tính</Text>
                            <View style={EditProfileStyle.FormWrap}>
                                <View style={EditProfileStyle.RadioGroup}>
                                    <View style={EditProfileStyle.RadioWrap}>
                                        <Text style={EditProfileStyle.RadioText}>Nam</Text>
                                        <RadioButton
                                            value="M"
                                            color={Theme.PrimaryColor}
                                            status={tempAccount.user.gender === 'M' ? 'checked' : 'unchecked'}
                                            onPress={() => updateUserOfTempAccount('gender', 'M')}
                                        />
                                    </View>
                                    <View style={EditProfileStyle.RadioWrap}>
                                        <Text style={EditProfileStyle.RadioText}>Nữ</Text>
                                        <RadioButton
                                            value="F"
                                            color={Theme.PrimaryColor}
                                            status={tempAccount.user.gender === 'F' ? 'checked' : 'unchecked'}
                                            onPress={() => updateUserOfTempAccount('gender', 'F')}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                        <Text style={EditProfileStyle.FormText}>Ngày sinh</Text>
                        <TouchableOpacity onPress={renderDatePicker} style={EditProfileStyle.FormWrap}>
                            <Text style={{ ...EditProfileStyle.FormData, padding: 16, fontSize: 16 }}>
                                {formatDate(tempAccount.user['date_of_birth'])}
                            </Text>
                        </TouchableOpacity>

                        <Portal>
                            <Snackbar
                                visible={snackBarVisible}
                                action={!loading ? { label: 'Tắt', onPress: () => setSnackBarVisible(false) } : null}
                                onDismiss={() => setSnackBarVisible(false)}
                            >
                                {!loading ? (
                                    snackBarMsg
                                ) : (
                                    <Loading style={{ flexDirection: 'row' }}>
                                        <Text style={EditProfileStyle.SnackbarText}>Đang cập nhật...</Text>
                                    </Loading>
                                )}
                            </Snackbar>
                        </Portal>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default EditProfile;
