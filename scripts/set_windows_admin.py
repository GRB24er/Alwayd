import subprocess
import ctypes
import sys
import logging
import time
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Path(__file__).stem + '.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def is_admin():
    """Check if the script is running with admin privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception as e:
        logger.error(f"Failed to check admin status: {e}")
        return False

def get_current_username():
    """Get the current Windows username."""
    try:
        result = subprocess.run(
            ["whoami"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5
        )
        if result.returncode == 0:
            # whoami returns DOMAIN\Username format, extract username
            username = result.stdout.strip().split('\\')[-1]
            return username
    except Exception as e:
        logger.error(f"Failed to get current username: {e}")
    return None

def username_exists(username):
    """Check if the specified username exists on the system."""
    try:
        result = subprocess.run(
            ["net", "user", username],
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Error checking user existence: {e}")
        return False

def check_user_in_group(username, group="Administrators"):
    """Check if user is already in the specified group."""
    try:
        result = subprocess.run(
            ["net", "localgroup", group],
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        
        if result.returncode == 0:
            # Check if username appears in the group listing
            lines = result.stdout.splitlines()
            for line in lines:
                if line.strip().lower() == username.lower():
                    return True
    except Exception as e:
        logger.error(f"Error checking group membership: {e}")
    return False

def add_to_administrators(username, max_retries=3):
    """Add user to Administrators group with retry logic."""
    
    # Validate username
    if not username or not isinstance(username, str):
        logger.error("Invalid username provided")
        return False
    
    username = username.strip()
    if not username:
        logger.error("Username cannot be empty")
        return False
    
    # Check if user exists
    if not username_exists(username):
        logger.error(f"User '{username}' does not exist on this system")
        logger.info(f"Tip: You can create the user with 'net user {username} <password> /add' first")
        return False
    
    # Check if already a member
    if check_user_in_group(username, "Administrators"):
        logger.info(f"User '{username}' is already a member of Administrators group")
        return True
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempt {attempt + 1}/{max_retries} to add '{username}' to Administrators")
            
            result = subprocess.run(
                ["net", "localgroup", "Administrators", username, "/add"],
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
                shell=False
            )
            
            # Success
            if result.returncode == 0:
                logger.info(f"SUCCESS: '{username}' added to Administrators group")
                return True
            
            # Handle specific error cases
            stderr_lower = result.stderr.lower()
            stdout_lower = result.stdout.lower()
            
            # Already a member (different error codes in different Windows versions)
            if any(msg in stderr_lower or msg in stdout_lower for msg in 
                   ["1378", "already a member", "is already", "member of group"]):
                logger.info(f"User '{username}' is already an Administrator")
                return True
            
            # User doesn't exist
            if any(msg in stderr_lower for msg in ["1376", "does not exist", "not found"]):
                logger.error(f"User '{username}' does not exist on this system")
                return False
            
            # Group doesn't exist (unlikely but possible)
            if any(msg in stderr_lower for msg in ["1377", "group does not exist"]):
                logger.error("Administrators group not found - critical system issue")
                return False
            
            # Permission denied
            if any(msg in stderr_lower for msg in ["5", "access is denied", "permission"]):
                logger.error("Permission denied - script may not be running with full admin rights")
                return False
            
            # Other error - retry if attempts remain
            logger.warning(f"Attempt {attempt + 1} failed: {result.stderr.strip()}")
            
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1, 2, 4 seconds
                logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed after {max_retries} attempts: {result.stderr.strip()}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout adding '{username}' to Administrators (attempt {attempt + 1})")
            if attempt < max_retries - 1:
                continue
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                continue
            return False
    
    return False

def elevate_privileges():
    """Request UAC elevation to run as administrator."""
    try:
        # Get the current script path
        script_path = sys.argv[0]
        
        # Build command line arguments
        params = []
        if len(sys.argv) > 1:
            # Quote arguments that might have spaces
            params = ['"' + arg + '"' if ' ' in arg else arg for arg in sys.argv[1:]]
        
        cmd_line = f'"{script_path}"' + (' ' + ' '.join(params) if params else '')
        
        logger.info("Requesting administrator privileges...")
        
        # Use ShellExecuteW with runas verb
        result = ctypes.windll.shell32.ShellExecuteW(
            None,           # hwnd
            "runas",        # operation
            sys.executable, # file
            cmd_line,       # parameters
            None,           # directory
            1               # nShowCmd (SW_SHOWNORMAL)
        )
        
        # ShellExecuteW returns value > 32 on success
        if result > 32:
            logger.info("Elevation request sent successfully")
            return True
        else:
            logger.error(f"Elevation failed with code: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to elevate privileges: {e}")
        return False

def main():
    """Main function with comprehensive error handling."""
    
    # Configuration
    username = "soccabet"  # Hardcoded as requested
    
    print("=" * 60)
    print("Administrator Privilege Management Tool")
    print("=" * 60)
    
    # Check admin status
    if not is_admin():
        logger.warning("Not running with administrator privileges")
        print("\nThis tool requires administrator privileges to modify user groups.")
        print("Requesting elevation via UAC...\n")
        
        # Try to elevate
        if not elevate_privileges():
            logger.error("Failed to elevate privileges")
            print("\nERROR: Could not obtain administrator privileges.")
            print("Please run this script as Administrator manually.")
            input("\nPress Enter to exit...")
            sys.exit(1)
        
        # Exit current non-admin instance (the elevated one will start fresh)
        logger.info("Exiting non-admin instance...")
        sys.exit(0)
    
    # We are now running as admin
    logger.info("Running with administrator privileges")
    
    # Optional: Get current username if needed
    current_user = get_current_username()
    if current_user:
        logger.info(f"Current user: {current_user}")
    
    # Add user to administrators group
    print(f"\nAttempting to add user '{username}' to Administrators group...")
    
    success = add_to_administrators(username)
    
    # Final result
    print("\n" + "=" * 60)
    if success:
        print(f"✓ SUCCESS: User '{username}' is now an administrator")
        logger.info("Operation completed successfully")
    else:
        print(f"✗ FAILED: Could not add '{username}' to Administrators group")
        logger.error("Operation failed")
        
        # Provide troubleshooting tips
        print("\nTroubleshooting tips:")
        print("1. Verify the user account exists: 'net user'")
        print(f"2. Create user if needed: 'net user {username} <password> /add'")
        print("3. Check if you have proper admin rights")
        print("4. Check Windows Event Viewer for security errors")
        print(f"5. Review the log file for more details")
    
    print("=" * 60)
    
    # Pause so user can see the result (unless run from command line without console)
    if sys.stdout.isatty():
        print("\nPress Enter to exit...")
        input()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\nOperation cancelled by user")
        print("\n\nOperation cancelled.")
        sys.exit(130)
    except Exception as e:
        logger.critical(f"Unexpected error: {e}", exc_info=True)
        print(f"\nFATAL ERROR: {e}")
        print("Please check the log file for details.")
        input("\nPress Enter to exit...")
        sys.exit(1)