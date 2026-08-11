import time
import random
import uuid
import httpx
import logging
from config import API_URL, INTERVAL_MS
from archetypes import (
    NormalEmployee,
    NightOwlDev,
    DisgruntledEmployee,
    CompromisedAccount,
    NegligentUser
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

NAMESPACE_UUID = uuid.UUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

def wait_for_backend():
    logger.info(f"Waiting for backend at {API_URL}...")
    for attempt in range(30):
        try:
            resp = httpx.get(f"{API_URL}/health", timeout=3.0)
            if resp.status_code == 200:
                logger.info("Backend is ready!")
                return
        except Exception:
            pass
        logger.info(f"Backend not ready yet (attempt {attempt + 1}/30), retrying in 3s...")
        time.sleep(3)
    logger.warning("Backend did not become ready in time, proceeding anyway...")

def get_deterministic_uuid(full_name: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_UUID, full_name)

USERS_DATA = {
    'Engineering': [
        "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Karthik Rajan", "Arjun Menon", 
        "Siddharth Rao", "Arun Prakash", "Vivek Nambiar", "Rohit Saxena", "Pooja Verma", 
        "Nikhil Joshi", "Divya Krishnan", "Sunil Mehta", "Ananya Gupta", "Vikram Singh", 
        "Deepak Pillai", "Meera Iyer", "Ravi Shankar", "Shreya Kulkarni", "Varun Malhotra", 
        "Aditi Banerjee", "Manish Tiwari", "Swati Deshpande", "Ganesh Subramanian", 
        "Nandini Raghavan", "Pranav Hegde", "Kavya Nair", "Tarun Bhatia", "Ishita Mukherjee", 
        "Aditya Srinivasan", "Harsha Vardhan", "Megha Reddy", "Pratik Agarwal", "Rekha Menon", 
        "Sameer Chakraborty", "Uma Maheshwari", "Vinod Krishnamurthy", "Bhavya Patel", 
        "Chandan Kumar", "Ritika Sharma", "Rahul Kumar", "Sanjay Gupta", "Vikash Yadav",
        "Praveen Kumar", "Suraj Sharma" # Added 5 to reach 150
    ],
    'Finance': [
        "Sneha Reddy", "Suresh Babu", "Kavitha Sundaram", "Rahul Deshmukh", "Lakshmi Narayanan", 
        "Neha Choudhary", "Mohan Rao", "Geeta Krishnamurthy", "Venkatesh Iyer", "Aarti Singhania", 
        "Ramesh Gupta", "Sunita Jain", "Prasad Kulkarni", "Madhavi Desai", "Ashok Nair", 
        "Savitha Hegde", "Pankaj Mishra", "Renuka Devi", "Srinivas Murthy", "Jaya Lakshmi", 
        "Dinesh Acharya", "Pallavi Shetty", "Manoj Pandey", "Usha Rani", "Kishore Babu", 
        "Anita Kamath", "Rajiv Menon", "Gayatri Iyer", "Hemant Deshmukh", "Nirmala Sundari"
    ],
    'HR': [
        "Deepika Nair", "Nitin Sharma", "Sangeetha Rajan", "Ajay Pradhan", "Revathi Subramaniam", 
        "Sachin Patil", "Bhargavi Reddy", "Mahesh Hegde", "Preethi Kumar", "Rajan Nambiar", 
        "Saroja Devi", "Vikrant Kapur", "Aparna Menon", "Gaurav Bhatt", "Indira Krishnan", 
        "Chitra Ramachandran", "Naveen Rao", "Padma Lakshmi", "Sudhir Joshi", "Vandana Gupta", 
        "Ashwin Kumar", "Janaki Raman", "Kiran Desai", "Mala Srinivasan", "Shobha Nair"
    ],
    'IT-Admin': [
        "Manoj Kumar", "Shalini Patel", "Raghav Menon", "Anand Krishnan", "Sowmya Iyer", 
        "Prashanth Rao", "Nithya Sundaram", "Balaji Subramanian", "Kamala Devi", "Girish Nair", 
        "Hema Malini", "Jagdish Sharma", "Leela Krishnamurthy", "Muralidhar Hegde", "Naga Lakshmi", 
        "Pavan Kumar", "Radha Rani", "Shankar Pillai", "Tara Nair", "Umesh Babu"
    ],
    'Sales': [
        "Vikram Malhotra", "Sunita Reddy", "Anil Kumar", "Bhavana Shetty", "Chandrashekar Rao", 
        "Durga Prasad", "Esha Gupta", "Farhan Ahmed", "Gokul Nath", "Haripriya Menon", 
        "Irfan Khan", "Jyothi Lakshmi", "Keshav Murthy", "Latha Subramaniam", "Mukesh Agarwal", 
        "Nalini Devi", "Om Prakash", "Padmini Rao", "Quincy Fernandes", "Ramya Krishnan", 
        "Santosh Hegde", "Tanuja Nair", "Uday Shankar", "Vasanthi Iyer", "Waheed Ali", 
        "Yamini Reddy", "Zaheer Hussain", "Akhila Menon", "Bhaskar Rao", "Charulatha Devi"
    ]
}

def create_population():
    population = []
    
    # Flatten users with department
    all_users = []
    for dept, names in USERS_DATA.items():
        for name in names:
            all_users.append({'username': name, 'department': dept})
            
    total = len(all_users)
    
    n_normal = int(0.78 * total)
    n_nightowl = int(0.13 * total)
    n_disgruntled = int(0.03 * total)
    n_compromised = int(0.02 * total)
    n_negligent = total - n_normal - n_nightowl - n_disgruntled - n_compromised
    
    archetype_assignments = (
        [NormalEmployee] * n_normal +
        [NightOwlDev] * n_nightowl +
        [DisgruntledEmployee] * n_disgruntled +
        [CompromisedAccount] * n_compromised +
        [NegligentUser] * n_negligent
    )
    
    random.shuffle(archetype_assignments)
    
    for user_info, arch_class in zip(all_users, archetype_assignments):
        user_id = get_deterministic_uuid(user_info['username'])
        user_obj = arch_class(user_id=user_id, username=user_info['username'], department=user_info['department'])
        population.append(user_obj)
        
    logger.info(f"Created population of {len(population)} users.")
    return population

def main():
    wait_for_backend()
    population = create_population()
    
    client = httpx.Client()
    ingest_url = f"{API_URL}/api/v1/events/ingest"
    
    logger.info("Starting simulation loop...")
    while True:
        try:
            user = random.choice(population)
            event = user.generate_event()
            
            try:
                response = client.post(ingest_url, json=event, timeout=5.0)
                status = response.status_code
            except Exception as e:
                status = f"Error: {str(e)}"
                
            logger.info(f"Event sent: {event['action_type']} by {user.username} [{user.__class__.__name__}] - Status: {status}")
            
            # Sleep with jitter
            base_sleep = INTERVAL_MS / 1000.0
            jitter = base_sleep * 0.3
            sleep_time = base_sleep + random.uniform(-jitter, jitter)
            time.sleep(sleep_time)
            
        except KeyboardInterrupt:
            logger.info("Simulation stopped by user.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in simulation loop: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
