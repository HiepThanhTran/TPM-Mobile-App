import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome, FontAwesome5, AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import 'moment/locale/vi';
import { RichEditor } from 'react-native-pell-rich-editor';
import RenderHTML from 'react-native-render-html';
import APIs, { authAPI, endPoints } from '../../configs/APIs';
import { status } from '../../configs/Constants';
import { useAccount } from '../../store/contexts/AccountContext';
import GlobalStyle from '../../styles/Style';
import Theme from '../../styles/Theme';
import { formatDate, isCloseToBottom } from '../../utils/Utilities';
import AllStyle from './AllStyle';
import CommentStyle from './CommentStyle';

const screenWidth = Dimensions.get('window').width;

const ActivityDetail = ({ route }) => {
    const [activityDetail, setActivityDetail] = useState(null);
    const [comments, setComments] = useState([]);
    const [page, setPage] = useState(1);
    const [activityDetailLoading, setActivityDetailLoading] = useState(true);
    const [commentLoading, setCommentLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [openedMenu, setOpenedMenu] = useState(null);
    const [editCommentID, setEditCommentID] = useState(null);
    const [editContent, setEditContent] = useState('');
    const richText = useRef();
    const [newcomment, setNewComment] = useState('');
    const { data: accountData } = useAccount();
    const activityID = route?.params?.activityID;

    const loadActivityDetail = async () => {
        try {
            setActivityDetailLoading(true);
            let res = await APIs.get(endPoints['activity-detail'](activityID));
            setActivityDetail(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setActivityDetailLoading(false);
        }
    };

    const loadComments = async () => {
        if (page > 0) {
            setCommentLoading(true);
            try {
                let res = await APIs.get(endPoints['activity-comments'](activityID), {
                    params: {
                        page: page,
                    },
                });
                if (res.data.next === null) {
                    setPage(0);
                }
                if (page === 1 || newcomment === '') {
                    setComments(res.data.results);
                } else {
                    setComments((current) => [...current, ...res.data.results]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setCommentLoading(false);
            }
        }
    };

    const postComment = async () => {
        let form = new FormData();
        form.append('content', newcomment);
        try {
            const accessToken = await AsyncStorage.getItem('access-token');
            let res = await authAPI(accessToken).post(endPoints['activity-comments'](activityID), form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (res.status === status.HTTP_201_CREATED) {
                setNewComment('');
            }
        } catch (err) {
            console.error(err.response.data);
        }
    };

    const editComment = async (commentID, updatedContent) => {
        try {
            const accessToken = await AsyncStorage.getItem('access-token');
            let res = await authAPI(accessToken).put(endPoints['comment-detail'](commentID), { content: updatedContent }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === status.HTTP_200_OK) {
                setComments((currentComments) =>
                    currentComments.map((comment) =>
                        comment.id === commentID ? { ...comment, content: updatedContent } : comment
                    )
                );
            }
        } catch (err) {
            console.error(err.response.data);
        }
    };

    const deleteComment = async (commentID) => {
        try {
            const accessToken = await AsyncStorage.getItem('access-token');
            let res = await authAPI(accessToken).delete(endPoints['comment-detail'](commentID), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === status.HTTP_204_NO_CONTENT) {
                setComments((currentComments) =>
                    currentComments.filter((comment) => comment.id !== commentID)
                );
            }
        } catch (err) {
            console.error(err.response.data);
        }
    };

    useEffect(() => {
        loadActivityDetail();
        loadComments();
    }, []);

    useEffect(() => {
        if (newcomment === '') richText?.current?.setContentHTML(newcomment);
        loadComments();
    }, [page, newcomment]);

    const loadMore = ({ nativeEvent }) => {
        if (!commentLoading && page > 0 && isCloseToBottom(nativeEvent)) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    const onRefresh = useCallback(async () => {
        setPage(1);
        setRefreshing(true);
        await loadComments(true);
        setRefreshing(false);
    }, [activityID]);

    const toggleMenu = (commentId) => {
        setOpenedMenu(openedMenu === commentId ? null : commentId);
    };

    const handleOutsideClick = () => {
        setOpenedMenu(null);
    };

    return (
        <>
            {activityDetailLoading ? (
                <View style={GlobalStyle.Container}>
                    <ActivityIndicator size="large" color={Theme.PrimaryColor} />
                </View>
            ) : (
                <View style={GlobalStyle.BackGround}>
                    <View style={AllStyle.ContainerScreenDetail}>
                        <ScrollView
                            key={activityDetail?.id}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            onScroll={loadMore}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        >
                            <View style={AllStyle.Description}>
                                <View style={AllStyle.CardImage}>
                                    <Image source={{ uri: activityDetail.image }} style={AllStyle.ImageDetail} />
                                </View>
                                <RenderHTML
                                    contentWidth={screenWidth}
                                    source={{ html: activityDetail.description }}
                                    baseStyle={AllStyle.ContentDetail}
                                    defaultTextProps={{
                                        numberOfLines: isExpanded ? undefined : 3,
                                        ellipsizeMode: 'tail',
                                    }}
                                />
                                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                                    <Text style={AllStyle.More}>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
                                </TouchableOpacity>

                                <Text style={AllStyle.AcitivityDetailText}>
                                    Đối tượng tham gia: {activityDetail.participant}
                                </Text>
                                <Text style={AllStyle.AcitivityDetailText}>
                                    Điểm cộng: {activityDetail.point}, {activityDetail.criterion}
                                </Text>
                                <Text style={AllStyle.AcitivityDetailText}>{activityDetail.semester}</Text>
                                <Text style={AllStyle.AcitivityDetailText}>Khoa: {activityDetail.faculty}</Text>
                                <Text style={AllStyle.AcitivityDetailText}>
                                    Ngày bắt đầu: <Text>{formatDate(activityDetail.start_date)}</Text>
                                </Text>
                                <Text style={AllStyle.AcitivityDetailText}>
                                    Ngày kết thúc: <Text>{formatDate(activityDetail.end_date)}</Text>
                                </Text>
                                <Text style={AllStyle.AcitivityDetailText}>Địa điểm: {activityDetail.location}</Text>
                                <View style={AllStyle.Time}>
                                    <Text style={AllStyle.DateTime}>
                                        Ngày tạo: <Text>{formatDate(activityDetail.created_date)}</Text>
                                    </Text>
                                    <Text style={AllStyle.DateTime}>
                                        Ngày cập nhập: <Text>{formatDate(activityDetail.updated_date)}</Text>
                                    </Text>
                                </View>

                                <View style={AllStyle.ReactContainer}>
                                    <View style={AllStyle.Like}>
                                        <TouchableOpacity>
                                            <AntDesign name="like2" size={30} color="black" />
                                        </TouchableOpacity>
                                        <Text style={AllStyle.LikeDetail}>2000</Text>
                                    </View>

                                    <View>
                                        <TouchableOpacity onPress={() => setShowCommentInput(!showCommentInput)}>
                                            <FontAwesome5 name="comment" size={24} color="black" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={CommentStyle.CommentContainer}>
                                <Text style={CommentStyle.CommentTitle}>Bình luận</Text>
                                {showCommentInput && (
                                    <View style={AllStyle.RichEditorContainer}>
                                        <RichEditor
                                            ref={richText}
                                            initialContentHTML={newcomment}
                                            onChange={(text) => setNewComment(text)}
                                            style={AllStyle.RichText}
                                            placeholder='Nhập bình luận của bạn'
                                        />

                                        <TouchableOpacity style={AllStyle.SendIcon} onPress={postComment}>
                                            <FontAwesome name="send" size={24} color="black" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <View style={GlobalStyle.BackGround}>
                                    {comments.map((comment) => (
                                        <View key={comment.id} style={AllStyle.Card}>
                                            <View style={CommentStyle.CommentTop}>
                                                <View style={CommentStyle.CommentCardImage}>
                                                    <Image
                                                        source={{ uri: comment.account.avatar }}
                                                        style={CommentStyle.CommentImage}
                                                    />
                                                </View>

                                                <View style={CommentStyle.CommentInfo}>
                                                    <Text style={CommentStyle.CommentName}>
                                                        {comment.account.user.last_name}
                                                        {comment.account.user.middle_name}
                                                        {comment.account.user.first_name}
                                                    </Text>
                                                    <Text style={CommentStyle.CommentTime}>
                                                        {moment(comment.created_date).fromNow()}
                                                    </Text>
                                                </View>
                                                {comment.account.id === accountData.id && ( // Kiểm tra xem comment có thuộc về tài khoản đăng nhập không
                                                    <TouchableOpacity onPress={() => toggleMenu(comment.id)}>
                                                        <FontAwesome name="ellipsis-h" size={24} color="black" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {openedMenu === comment.id && (
                                                <View style={CommentStyle.CommentMenu}>
                                                    <TouchableOpacity onPress={() => editComment(comment.id, comment.content)}>
                                                        <Text style={CommentStyle.CommentMenuItem}>Chỉnh sửa</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => deleteComment(comment.id)}>
                                                        <Text style={CommentStyle.CommentMenuItem}>Xóa</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            <View>
                                                <RenderHTML
                                                    contentWidth={screenWidth}
                                                    source={{ html: comment.content }}
                                                    baseStyle={AllStyle.Content}
                                                    defaultTextProps={{
                                                        numberOfLines: 3,
                                                        ellipsizeMode: 'tail',
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                    {commentLoading && <ActivityIndicator size="large" color={Theme.PrimaryColor} />}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}
        </>
    );
};

export default ActivityDetail;
