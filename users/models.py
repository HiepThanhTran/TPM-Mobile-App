import random

from cloudinary.models import CloudinaryField
from django.contrib.auth.models import AbstractUser, Permission, Group
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _

from activities.models import Activity
from tpm.models import BaseModel


class Account(AbstractUser):
    class Meta:
        verbose_name = _('Account')
        verbose_name_plural = _('Accounts')
        permissions = [
            ('create_student_account', 'Can create student account'),
            ('create_assistant_account', 'Can create assistant account'),
            ('create_specialist_account', 'Can create specialist account'),
        ]

    class Role(models.TextChoices):
        ADMINISTRATOR = 'AD', _('Administrator')
        STUDENT = 'STU', _('Sinh viên')
        ASSISTANT = 'ASST', _('Trợ lý sinh viên')
        SPECIALIST = 'SPC', _('Chuyên viên cộng tác sinh viên')

    email = models.EmailField(unique=True)
    avatar = CloudinaryField(null=True, blank=True)
    role = models.CharField(max_length=4, choices=Role, null=True)
    username = models.CharField(max_length=150, null=True, unique=True)

    first_name = None
    last_name = None

    from users.managers import AccountManager
    objects = AccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.username is None:
            self.username = self.email

        return super().save(*args, **kwargs)

    def has_in_group(self, name=None):
        return self.groups.filter(name=name).exists()


class User(BaseModel):
    class Meta:
        abstract = True

    class Gender(models.TextChoices):
        MALE = 'M', _('Nam')
        FEMALE = 'F', _('Nữ')
        UNKNOWN = 'U', _('Khác')

    first_name = models.CharField(max_length=50)  # Tên
    middle_name = models.CharField(max_length=50)  # Tên đệm
    last_name = models.CharField(max_length=50)  # Họ
    date_of_birth = models.DateField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, unique=True)
    gender = models.CharField(max_length=1, choices=Gender, default=Gender.UNKNOWN)
    code = models.CharField(max_length=10, null=True, blank=True, unique=True, db_index=True, editable=False)

    account = models.OneToOneField(Account, null=True, blank=True, on_delete=models.SET_NULL, related_name='%(class)s')
    faculty = models.ForeignKey('schools.Faculty', null=True, on_delete=models.SET_NULL, related_name='%(class)ss')

    def __str__(self):
        return f'{self.code} - {self.full_name}'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.code is None:
            self.code = self.generate_code()
            self.save()

    @property
    def full_name(self):
        return f'{self.last_name} {self.middle_name} {self.first_name}'

    def generate_code(self):
        raise NotImplemented()


class Officer(User):
    class Meta:
        abstract = True

    activities = GenericRelation(
        Activity,
        related_query_name='officers',
        content_type_field='created_by_type',
        object_id_field='created_by_id'
    )

    def generate_code(self):
        return f'{self.faculty.id:02d}{random.randint(0, 99):02d}{self.id:06d}'


class Administrator(Officer):
    class Meta:
        verbose_name = _('Administrator')
        verbose_name_plural = _('Administrators')

    def generate_code(self):
        return f'AD{random.randint(0, 99):02d}{self.id:06d}'


class Specialist(Officer):
    class Meta:
        verbose_name = _('Specialist')
        verbose_name_plural = _('Specialists')

    job_title = models.CharField(max_length=50, null=True, blank=True)
    academic_degree = models.CharField(max_length=50, null=True, blank=True)


class Assistant(Officer):
    class Meta:
        verbose_name = _('Assistant')
        verbose_name_plural = _('Assistants')


class Student(User):
    class Meta:
        verbose_name = _('Student')
        verbose_name_plural = _('Students')

    major = models.ForeignKey('schools.Major', null=True, on_delete=models.SET_NULL, related_name='students')  # Chuyên ngành nào?
    sclass = models.ForeignKey('schools.Class', null=True, on_delete=models.SET_NULL, related_name='students')  # Lớp nào?
    academic_year = models.ForeignKey('schools.AcademicYear', null=True, on_delete=models.SET_NULL, related_name='students')  # Khóa bao nhiêu?
    educational_system = models.ForeignKey('schools.EducationalSystem', null=True, on_delete=models.SET_NULL, related_name='students')  # Hệ đào tạo nào?

    def generate_code(self):
        return f'{str(self.academic_year.start_date.year)[-2:]}{self.faculty.id:02d}{self.id:06d}'
