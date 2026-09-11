-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: attendance_analytics
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance_logs`
--

DROP TABLE IF EXISTS `attendance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_logs` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `login_time` time DEFAULT NULL,
  `logout_time` time DEFAULT NULL,
  `working_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `late_minutes` int DEFAULT '0',
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `employee_id` (`employee_id`,`attendance_date`),
  CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_logs`
--

LOCK TABLES `attendance_logs` WRITE;
/*!40000 ALTER TABLE `attendance_logs` DISABLE KEYS */;
INSERT INTO `attendance_logs` VALUES (1,1,'2026-08-01','Present','09:00:00','18:00:00',9.00,1.00,0),(2,2,'2026-08-01','Present','08:55:00','17:45:00',8.83,0.83,0),(3,3,'2026-08-01','Absent',NULL,NULL,0.00,0.00,0),(4,4,'2026-08-01','Present','09:10:00','18:05:00',8.92,0.92,10),(5,5,'2026-08-01','Late','09:30:00','18:30:00',9.00,1.00,30),(6,1,'2026-08-02','Late','09:25:00','18:15:00',8.83,0.83,25),(7,2,'2026-08-02','Present','08:58:00','17:50:00',8.87,0.87,0),(8,3,'2026-08-02','Present','09:02:00','18:00:00',8.97,0.97,2),(9,4,'2026-08-02','Absent',NULL,NULL,0.00,0.00,0),(10,5,'2026-08-02','Present','09:05:00','18:10:00',9.08,1.08,5);
/*!40000 ALTER TABLE `attendance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_logs_archive`
--

DROP TABLE IF EXISTS `attendance_logs_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_logs_archive` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `login_time` time DEFAULT NULL,
  `logout_time` time DEFAULT NULL,
  `working_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `late_minutes` int DEFAULT '0',
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `employee_id` (`employee_id`,`attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_logs_archive`
--

LOCK TABLES `attendance_logs_archive` WRITE;
/*!40000 ALTER TABLE `attendance_logs_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_logs_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `resource` varchar(100) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `status` varchar(20) NOT NULL,
  `error_message` text,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_module` (`module`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_timestamp` (`timestamp`),
  KEY `idx_audit_logs_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:04:16'),(2,1,'LOGOUT','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:09:54'),(3,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:10:18'),(4,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:18:16'),(5,1,'FILE_UPLOAD','DATA_UPLOAD','FILE','attendance_test.csv','null','{\"filename\": \"attendance_test.csv\"}',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:20:11'),(6,1,'FILE_VALIDATED','DATA_UPLOAD','FILE','attendance_test.csv','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:20:11'),(7,1,'FILE_PROCESSED','DATA_UPLOAD','FILE','attendance_test.csv','null','{\"records_processed\": 5}',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:20:12'),(8,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 08:53:48'),(9,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 09:25:17'),(10,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 09:36:20'),(11,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 10:03:06'),(12,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 16:56:31'),(13,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 17:56:17'),(14,1,'FILE_UPLOAD','DATA_UPLOAD','FILE','attendance_test.csv','null','{\"filename\": \"attendance_test.csv\"}',NULL,NULL,'SUCCESS',NULL,'2026-08-29 17:56:42'),(15,1,'FILE_VALIDATED','DATA_UPLOAD','FILE','attendance_test.csv','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 17:56:42'),(16,1,'FILE_PROCESSED','DATA_UPLOAD','FILE','attendance_test.csv','null','{\"records_processed\": 5}',NULL,NULL,'SUCCESS',NULL,'2026-08-29 17:56:42'),(17,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-29 18:21:42'),(18,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 13:54:28'),(19,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 14:27:10'),(20,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 14:33:23'),(21,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 14:40:31'),(22,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 14:46:53'),(23,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 16:15:17'),(24,1,'LOGIN_FAILED','AUTHENTICATION','USER','1','null','null',NULL,NULL,'FAILED','Invalid email or password','2026-08-30 16:16:26'),(25,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 16:17:10'),(26,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 16:35:34'),(27,1,'LOGIN','AUTHENTICATION','USER','1','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 16:46:25'),(28,2,'LOGIN','AUTHENTICATION','USER','2','null','null',NULL,NULL,'SUCCESS',NULL,'2026-08-30 16:52:41');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `department_id` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `department_name` (`department_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (4,'Finance'),(1,'HR'),(3,'IT'),(5,'Marketing'),(2,'Sales');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `employee_name` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `department_id` int NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `email` (`email`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'E001','Rahul Sharma','rahul@company.com',2,'Sales Executive','2024-06-10','Active'),(2,'E002','Priya Nair','priya@company.com',1,'HR Executive','2023-08-15','Active'),(3,'E003','Arjun Kumar','arjun@company.com',3,'Software Engineer','2024-01-20','Active'),(4,'E004','Sneha Rao','sneha@company.com',4,'Finance Analyst','2022-11-05','Active'),(5,'E005','Vikram Singh','vikram@company.com',5,'Marketing Executive','2025-02-12','Active');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaves`
--

DROP TABLE IF EXISTS `leaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaves` (
  `leave_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_date` date NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`leave_id`),
  UNIQUE KEY `employee_id` (`employee_id`,`leave_date`),
  CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaves`
--

LOCK TABLES `leaves` WRITE;
/*!40000 ALTER TABLE `leaves` DISABLE KEYS */;
INSERT INTO `leaves` VALUES (1,2,'2026-08-03','Casual','Approved','Personal work'),(2,3,'2026-08-04','Sick','Approved','Medical reason'),(3,5,'2026-08-05','Annual','Approved','Family trip'),(4,1,'2026-08-25','Casual','Approved','PERSONAL WORK'),(5,1,'2026-08-28','Casual','Approved',' Personal work'),(6,1,'2026-08-29','Casual','Approved','kelsa');
/*!40000 ALTER TABLE `leaves` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_employee` (`employee_id`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,NULL,'HR Manager','hr@attendance.com','$argon2id$v=19$m=65536,t=3,p=4$AlaUB1MuX0rGPx02CpyekA$UTaNOLjgXv3uCswH4wAY9FPQ58S+54ERNA3wDcny0/w','HR_MANAGER',1,'2026-08-25 15:56:37','2026-08-27 07:46:11'),(2,1,'Rahul Sharma','rahul@attendance.com','$argon2id$v=19$m=65536,t=3,p=4$CWo8VCDr2UdXA4KeUUmebQ$WzRaVPFYWV/ZruoowkjRxXOJZQYaXJPGsx/VD9gWuss','EMPLOYEE',1,'2026-08-25 17:50:40','2026-08-27 06:07:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-31 12:31:16
