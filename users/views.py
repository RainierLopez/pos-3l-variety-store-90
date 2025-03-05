
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from .models import UserProfile
from .forms import LoginForm, RegisterForm, UserProfileForm

def login_view(request):
    """Handle user login"""
    if request.user.is_authenticated:
        return redirect('pos_home')
    
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                next_url = request.GET.get('next', 'pos_home')
                return redirect(next_url)
            else:
                messages.error(request, 'Invalid credentials. Please try again.')
    else:
        form = LoginForm()
    
    return render(request, 'users/login.html', {'form': form})

def logout_view(request):
    """Handle user logout"""
    logout(request)
    return redirect('login')

@login_required
def register_user(request):
    """Register a new user - Admin only"""
    # Check if user is admin
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to register new users.')
        return redirect('pos_home')
    
    if request.method == 'POST':
        user_form = RegisterForm(request.POST)
        profile_form = UserProfileForm(request.POST)
        
        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save(commit=False)
            user.set_password(user_form.cleaned_data['password1'])
            user.save()
            
            # Create user profile
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()
            
            messages.success(request, f'User {user.username} has been created successfully.')
            return redirect('user_list')
    else:
        user_form = RegisterForm()
        profile_form = UserProfileForm()
    
    return render(request, 'users/register.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

@login_required
def user_list(request):
    """List all users - Admin only"""
    # Check if user is admin
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to view this page.')
        return redirect('pos_home')
    
    users = User.objects.filter(is_superuser=False).order_by('username')
    return render(request, 'users/user_list.html', {'users': users})

@login_required
def user_detail(request, user_id):
    """View user details - Admin only"""
    # Check if user is admin
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to view this page.')
        return redirect('pos_home')
    
    user = User.objects.get(id=user_id)
    return render(request, 'users/user_detail.html', {'user': user})
